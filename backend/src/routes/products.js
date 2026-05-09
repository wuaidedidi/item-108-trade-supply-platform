import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const includeProduct = {
  supplier: { select: { id: true, name: true, username: true } },
  inventory: true,
  _count: { select: { orders: true, reviews: true } }
};

const productSchema = z.object({
  name: z.string().trim().min(2, '请输入商品名称').max(80, '商品名称不能超过80个字符'),
  category: z.string().trim().min(2, '请输入分类').max(40, '分类不能超过40个字符'),
  description: z.string().trim().min(5, '请输入商品说明'),
  price: z.coerce.number().positive('价格必须大于0'),
  unit: z.string().trim().min(1, '请输入单位').max(12, '单位不能超过12个字符'),
  status: z.enum(['ACTIVE', 'INACTIVE'], { message: '状态不正确' }).default('ACTIVE'),
  quantity: z.coerce.number().int().min(0, '库存不能小于0').default(0),
  warningLevel: z.coerce.number().int().min(0, '预警值不能小于0').default(10)
});

export default async function productRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema, request.query);
    const where = {
      AND: [
        query.keyword
          ? {
              OR: [
                { name: { contains: query.keyword } },
                { category: { contains: query.keyword } },
                { description: { contains: query.keyword } }
              ]
            }
          : {},
        query.category ? { category: query.category } : {},
        query.status ? { status: query.status } : {},
        request.user.role === 'SUPPLIER' ? { supplierId: request.user.id } : {}
      ]
    };
    const [items, total, categories] = await Promise.all([
      fastify.prisma.product.findMany({
        where,
        include: includeProduct,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.product.count({ where }),
      fastify.prisma.product.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } })
    ]);
    return ok(reply, { ...pageResult(items, total, query.page, query.pageSize), categories: categories.map((item) => item.category) });
  });

  fastify.get('/:id', async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const product = await fastify.prisma.product.findUnique({ where: { id: params.id }, include: includeProduct });
    if (!product) throw fail('商品不存在', 404);
    if (request.user.role === 'SUPPLIER' && product.supplierId !== request.user.id) throw fail('无权查看该商品', 403);
    return ok(reply, product);
  });

  fastify.post('/', { preHandler: requireAnyRole(['SUPPLIER', 'ADMIN']) }, async (request, reply) => {
    const payload = validate(productSchema, request.body);
    const product = await fastify.prisma.product.create({
      data: {
        name: payload.name,
        category: payload.category,
        description: payload.description,
        price: payload.price,
        unit: payload.unit,
        status: payload.status,
        supplierId: request.user.id,
        inventory: { create: { quantity: payload.quantity, warningLevel: payload.warningLevel, reserved: 0, turnoverMonthly: 0 } }
      },
      include: includeProduct
    });
    return ok(reply, product, '商品已创建');
  });

  fastify.put('/:id', { preHandler: requireAnyRole(['SUPPLIER', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(productSchema, request.body);
    const current = await fastify.prisma.product.findUnique({ where: { id: params.id } });
    if (!current) throw fail('商品不存在', 404);
    if (!canSeeAll(request.user.role) && current.supplierId !== request.user.id) throw fail('无权编辑该商品', 403);
    const product = await fastify.prisma.product.update({
      where: { id: params.id },
      data: {
        name: payload.name,
        category: payload.category,
        description: payload.description,
        price: payload.price,
        unit: payload.unit,
        status: payload.status,
        inventory: {
          upsert: {
            update: { quantity: payload.quantity, warningLevel: payload.warningLevel },
            create: { quantity: payload.quantity, warningLevel: payload.warningLevel, reserved: 0, turnoverMonthly: 0 }
          }
        }
      },
      include: includeProduct
    });
    return ok(reply, product, '商品已更新');
  });

  fastify.delete('/:id', { preHandler: requireAnyRole(['SUPPLIER', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const current = await fastify.prisma.product.findUnique({ where: { id: params.id } });
    if (!current) throw fail('商品不存在', 404);
    if (!canSeeAll(request.user.role) && current.supplierId !== request.user.id) throw fail('无权删除该商品', 403);
    const orderCount = await fastify.prisma.order.count({ where: { productId: params.id } });
    if (orderCount > 0) throw fail(`该商品已关联 ${orderCount} 笔订单，无法删除`, 400);
    await fastify.prisma.product.delete({ where: { id: params.id } });
    return ok(reply, null, '商品已删除');
  });
}
