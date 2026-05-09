import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const includeOrder = {
  buyer: { select: { id: true, name: true, username: true } },
  supplier: { select: { id: true, name: true, username: true } },
  product: { select: { id: true, name: true, unit: true, category: true } },
  payments: true,
  reviews: true
};

const createSchema = z.object({
  productId: z.coerce.number().int().positive('请选择商品'),
  quantity: z.coerce.number().int().positive('数量必须大于0'),
  expectedDate: z.string().trim().optional().nullable(),
  remark: z.string().trim().max(200, '备注不能超过200个字符').optional().nullable()
});

const updateSchema = z.object({
  quantity: z.coerce.number().int().positive('数量必须大于0').optional(),
  status: z.enum(['PENDING_QUOTE', 'QUOTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'REFUNDED', 'CANCELLED'], { message: '订单状态不正确' }).optional(),
  expectedDate: z.string().trim().optional().nullable(),
  remark: z.string().trim().max(200, '备注不能超过200个字符').optional().nullable()
});

function orderWhere(query, user) {
  return {
    AND: [
      query.keyword
        ? {
            OR: [
              { orderNo: { contains: query.keyword } },
              { remark: { contains: query.keyword } },
              { product: { is: { name: { contains: query.keyword } } } }
            ]
          }
        : {},
      query.status ? { status: query.status } : {},
      user.role === 'USER' ? { buyerId: user.id } : {},
      user.role === 'SUPPLIER' ? { supplierId: user.id } : {}
    ]
  };
}

export default async function orderRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema, request.query);
    const where = orderWhere(query, request.user);
    const [items, total] = await Promise.all([
      fastify.prisma.order.findMany({
        where,
        include: includeOrder,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.order.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.get('/:id', async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const order = await fastify.prisma.order.findUnique({ where: { id: params.id }, include: includeOrder });
    if (!order) throw fail('订单不存在', 404);
    if (!canSeeAll(request.user.role) && ![order.buyerId, order.supplierId].includes(request.user.id)) throw fail('无权查看该订单', 403);
    return ok(reply, order);
  });

  fastify.post('/', async (request, reply) => {
    const payload = validate(createSchema, request.body);
    const product = await fastify.prisma.product.findUnique({ where: { id: payload.productId }, include: { inventory: true } });
    if (!product || product.status !== 'ACTIVE') throw fail('商品不可下单', 400);
    if ((product.inventory?.quantity || 0) - (product.inventory?.reserved || 0) < payload.quantity) throw fail('商品可用库存不足', 400);
    const totalAmount = Number(product.price) * payload.quantity;
    const orderNo = `TS${Date.now()}`;
    const order = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          buyerId: request.user.id,
          supplierId: product.supplierId,
          productId: product.id,
          quantity: payload.quantity,
          unitPrice: product.price,
          totalAmount,
          status: 'PENDING_QUOTE',
          expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : null,
          remark: payload.remark || null
        },
        include: includeOrder
      });
      await tx.inventory.update({ where: { productId: product.id }, data: { reserved: { increment: payload.quantity } } });
      await tx.notification.create({
        data: { userId: product.supplierId, type: 'ORDER', title: '收到新的采购需求', content: `${request.user.name} 提交了 ${product.name} 的采购需求。` }
      });
      return created;
    });
    return ok(reply, order, '订单已提交');
  });

  fastify.put('/:id', async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(updateSchema, request.body);
    const current = await fastify.prisma.order.findUnique({ where: { id: params.id }, include: { product: true } });
    if (!current) throw fail('订单不存在', 404);
    const isParticipant = [current.buyerId, current.supplierId].includes(request.user.id);
    if (!canSeeAll(request.user.role) && !isParticipant) throw fail('无权更新该订单', 403);
    if (request.user.role === 'USER' && payload.status && !['CANCELLED'].includes(payload.status)) throw fail('普通用户只能取消自己的订单', 403);
    if (request.user.role === 'SUPPLIER' && payload.status && !['QUOTED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'].includes(payload.status)) {
      throw fail('供应方不能设置该订单状态', 403);
    }
    const quantity = payload.quantity || current.quantity;
    const totalAmount = Number(current.unitPrice) * quantity;
    const updated = await fastify.prisma.order.update({
      where: { id: params.id },
      data: {
        quantity,
        totalAmount,
        status: payload.status,
        expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : payload.expectedDate === null ? null : undefined,
        remark: payload.remark === undefined ? undefined : payload.remark
      },
      include: includeOrder
    });
    return ok(reply, updated, '订单已更新');
  });

  fastify.delete('/:id', { preHandler: requireAnyRole(['ADMIN', 'FINANCE']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const [payments, reviews] = await Promise.all([
      fastify.prisma.payment.count({ where: { orderId: params.id } }),
      fastify.prisma.review.count({ where: { orderId: params.id } })
    ]);
    if (payments > 0) throw fail(`该订单已有 ${payments} 条结算记录，无法删除`, 400);
    if (reviews > 0) throw fail(`该订单已有 ${reviews} 条评价，无法删除`, 400);
    await fastify.prisma.order.delete({ where: { id: params.id } });
    return ok(reply, null, '订单已删除');
  });
}
