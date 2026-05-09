import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

const prisma = new PrismaClient();

const hashPassword = (password) => bcrypt.hash(password, 10);

async function upsertUser(user) {
  const passwordHash = await hashPassword(user.password);
  return prisma.user.upsert({
    where: { username: user.username },
    update: {
      passwordHash,
      name: user.name,
      role: user.role,
      status: 'ACTIVE',
      email: user.email,
      phone: user.phone,
      quota: user.quota
    },
    create: {
      username: user.username,
      passwordHash,
      name: user.name,
      role: user.role,
      status: 'ACTIVE',
      email: user.email,
      phone: user.phone,
      quota: user.quota
    }
  });
}

async function main() {
  const admin = await upsertUser({
    username: 'admin',
    password: '123456',
    name: '平台管理员',
    role: 'ADMIN',
    email: 'admin@example.com',
    phone: '13800000000',
    quota: 200000
  });

  const buyer = await upsertUser({
    username: 'user',
    password: '123456',
    name: '采购专员',
    role: 'USER',
    email: 'buyer@example.com',
    phone: '13800000001',
    quota: 80000
  });

  const supplier = await upsertUser({
    username: 'supplier',
    password: '123456',
    name: '华东供应商',
    role: 'SUPPLIER',
    email: 'supplier@example.com',
    phone: '13800000002',
    quota: 120000
  });

  const auditor = await upsertUser({
    username: 'auditor',
    password: '123456',
    name: '流程审核员',
    role: 'AUDITOR',
    email: 'auditor@example.com',
    phone: '13800000003',
    quota: 100000
  });

  const finance = await upsertUser({
    username: 'finance',
    password: '123456',
    name: '财务管理员',
    role: 'FINANCE',
    email: 'finance@example.com',
    phone: '13800000004',
    quota: 300000
  });

  const productData = [
    ['工业传感器套件', '智能硬件', '适用于产线监测的高稳定性传感器组合，含温湿度与振动采集。', 1280, '套', 160, 26, 7.4],
    ['仓储周转箱', '仓储耗材', '可堆叠耐磨周转箱，适配仓储、门店补货和逆向物流。', 46, '个', 3200, 180, 8.9],
    ['标准化采购服务包', '企业服务', '包含询价、供应商协调、到货跟进和票据归档的一站式服务。', 6800, '项', 35, 4, 5.8],
    ['办公设备维保', '运维服务', '覆盖打印机、会议设备和基础网络设备的月度巡检服务。', 3200, '月', 48, 6, 4.2],
    ['低温运输资源', '物流资源', '城市冷链配送资源，支持订单履约追踪与异常反馈。', 980, '车次', 90, 12, 6.3]
  ];

  const products = [];
  for (const [name, category, description, price, unit, quantity, warningLevel, turnoverMonthly] of productData) {
    const product = await prisma.product.upsert({
      where: { id: products.length + 1 },
      update: {
        name,
        category,
        description,
        price,
        unit,
        status: 'ACTIVE',
        supplierId: supplier.id
      },
      create: {
        name,
        category,
        description,
        price,
        unit,
        status: 'ACTIVE',
        supplierId: supplier.id
      }
    });
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity, reserved: Math.min(20, Math.floor(quantity * 0.08)), warningLevel, turnoverMonthly },
      create: { productId: product.id, quantity, reserved: Math.min(20, Math.floor(quantity * 0.08)), warningLevel, turnoverMonthly }
    });
    products.push(product);
  }

  const ordersSeed = [
    ['TS20260501001', buyer.id, supplier.id, products[0].id, 6, 1280, 'COMPLETED', '用于华东工厂二期设备监测'],
    ['TS20260502002', buyer.id, supplier.id, products[1].id, 280, 46, 'PROCESSING', '门店周转箱补货'],
    ['TS20260503003', admin.id, supplier.id, products[2].id, 1, 6800, 'APPROVED', '季度采购外包服务'],
    ['TS20260504004', buyer.id, supplier.id, products[4].id, 8, 980, 'REFUNDED', '冷链资源异常退款'],
    ['TS20260505005', finance.id, supplier.id, products[3].id, 2, 3200, 'QUOTED', '总部会议设备维保']
  ];

  for (const [orderNo, buyerId, supplierId, productId, quantity, unitPrice, status, remark] of ordersSeed) {
    await prisma.order.upsert({
      where: { orderNo },
      update: { buyerId, supplierId, productId, quantity, unitPrice, totalAmount: quantity * unitPrice, status, remark },
      create: { orderNo, buyerId, supplierId, productId, quantity, unitPrice, totalAmount: quantity * unitPrice, status, remark }
    });
  }

  const orders = await prisma.order.findMany({ orderBy: { id: 'asc' } });
  for (const order of orders.filter((item) => ['COMPLETED', 'PROCESSING', 'APPROVED', 'REFUNDED'].includes(item.status))) {
    await prisma.payment.upsert({
      where: { paymentNo: `PAY-${order.orderNo}` },
      update: {
        orderId: order.id,
        userId: order.buyerId,
        amount: order.totalAmount,
        status: order.status === 'REFUNDED' ? 'REFUNDED' : 'PAID',
        paidAt: new Date(),
        note: order.status === 'REFUNDED' ? '资源异常，已完成退款' : '交易结算完成'
      },
      create: {
        paymentNo: `PAY-${order.orderNo}`,
        orderId: order.id,
        userId: order.buyerId,
        amount: order.totalAmount,
        status: order.status === 'REFUNDED' ? 'REFUNDED' : 'PAID',
        paidAt: new Date(),
        note: order.status === 'REFUNDED' ? '资源异常，已完成退款' : '交易结算完成'
      }
    });
  }

  const appRows = [
    ['冷链资源追加申请', 'PURCHASE', 12000, '华南客户临时追加低温配送需求，需要审核采购额度。', buyer.id, auditor.id, 'PENDING', null],
    ['月度报销申请', 'REIMBURSEMENT', 2360, '供应商现场验收差旅费用报销。', supplier.id, auditor.id, 'APPROVED', '票据完整，准予报销'],
    ['采购额度提升', 'QUOTA', 50000, '二季度订单集中，申请提升采购额度。', buyer.id, auditor.id, 'REJECTED', '请补充部门预算批复后重新提交']
  ];

  for (const [title, type, amount, reason, applicantId, reviewerId, status, comment] of appRows) {
    const existed = await prisma.application.findFirst({ where: { title } });
    if (existed) {
      await prisma.application.update({ where: { id: existed.id }, data: { type, amount, reason, applicantId, reviewerId, status, comment } });
    } else {
      await prisma.application.create({ data: { title, type, amount, reason, applicantId, reviewerId, status, comment } });
    }
  }

  const completedOrder = orders.find((item) => item.status === 'COMPLETED');
  if (completedOrder) {
    const existedReview = await prisma.review.findFirst({ where: { orderId: completedOrder.id } });
    const reviewData = {
      orderId: completedOrder.id,
      productId: completedOrder.productId,
      userId: completedOrder.buyerId,
      rating: 5,
      content: '交付稳定，供应方响应及时，后续会继续复购。'
    };
    if (existedReview) {
      await prisma.review.update({ where: { id: existedReview.id }, data: reviewData });
    } else {
      await prisma.review.create({ data: reviewData });
    }
  }

  const users = [admin, buyer, supplier, auditor, finance];
  for (const user of users) {
    const existed = await prisma.notification.findFirst({ where: { userId: user.id, title: '平台演示数据已就绪' } });
    if (!existed) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: '平台演示数据已就绪',
          content: '商品、订单、申请、结算和评价数据已初始化，可直接体验完整流程。'
        }
      });
    }
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
