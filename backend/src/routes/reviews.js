import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const includeReview = {
  user: { select: { id: true, name: true, username: true } },
  product: { select: { id: true, name: true, category: true } },
  order: { select: { id: true, orderNo: true, status: true } }
};

const reviewSchema = z.object({
  orderId: z.coerce.number().int().positive('请选择订单'),
  rating: z.coerce.number().int().min(1, '评分不能低于1分').max(5, '评分不能高于5分'),
  content: z.string().trim().min(4, '请输入评价内容').max(300, '评价内容不能超过300个字符')
});

export default async function reviewRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema, request.query);
    const where = {
      AND: [
        query.keyword
          ? { OR: [{ content: { contains: query.keyword } }, { product: { is: { name: { contains: query.keyword } } } }, { order: { is: { orderNo: { contains: query.keyword } } } }] }
          : {},
        canSeeAll(request.user.role) ? {} : request.user.role === 'SUPPLIER' ? { product: { is: { supplierId: request.user.id } } } : { userId: request.user.id }
      ]
    };
    const [items, total] = await Promise.all([
      fastify.prisma.review.findMany({
        where,
        include: includeReview,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.review.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.post('/', async (request, reply) => {
    const payload = validate(reviewSchema, request.body);
    const order = await fastify.prisma.order.findUnique({ where: { id: payload.orderId } });
    if (!order) throw fail('订单不存在，不能评价', 404);
    if (order.buyerId !== request.user.id && !canSeeAll(request.user.role)) throw fail('只能评价自己的订单', 403);
    if (order.status !== 'COMPLETED') throw fail('订单完成后才能评价', 400);
    const existed = await fastify.prisma.review.findFirst({ where: { orderId: order.id, userId: request.user.id } });
    if (existed) throw fail('该订单已经评价过', 400);
    const review = await fastify.prisma.review.create({
      data: { orderId: order.id, productId: order.productId, userId: request.user.id, rating: payload.rating, content: payload.content },
      include: includeReview
    });
    return ok(reply, review, '评价已提交');
  });

  fastify.delete('/:id', { preHandler: requireAnyRole(['ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    await fastify.prisma.review.delete({ where: { id: params.id } });
    return ok(reply, null, '评价已删除');
  });
}
