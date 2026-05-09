import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const includePayment = {
  user: { select: { id: true, name: true, username: true } },
  order: {
    select: {
      id: true,
      orderNo: true,
      status: true,
      product: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } }
    }
  }
};

const createSchema = z.object({
  orderId: z.coerce.number().int().positive('请选择订单'),
  amount: z.coerce.number().positive('结算金额必须大于0'),
  status: z.enum(['UNPAID', 'PAID', 'REFUNDED'], { message: '结算状态不正确' }),
  note: z.string().trim().max(200, '备注不能超过200个字符').optional().nullable()
});

const updateSchema = createSchema.partial();

export default async function paymentRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema, request.query);
    const where = {
      AND: [
        query.keyword ? { OR: [{ paymentNo: { contains: query.keyword } }, { order: { is: { orderNo: { contains: query.keyword } } } }] } : {},
        query.status ? { status: query.status } : {},
        canSeeAll(request.user.role) ? {} : { userId: request.user.id }
      ]
    };
    const [items, total] = await Promise.all([
      fastify.prisma.payment.findMany({
        where,
        include: includePayment,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.payment.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.post('/', { preHandler: requireAnyRole(['FINANCE', 'ADMIN']) }, async (request, reply) => {
    const payload = validate(createSchema, request.body);
    const order = await fastify.prisma.order.findUnique({ where: { id: payload.orderId } });
    if (!order) throw fail('订单不存在，不能创建结算', 404);
    const existed = await fastify.prisma.payment.findFirst({ where: { orderId: order.id } });
    if (existed) throw fail('该订单已存在结算记录', 400);
    const payment = await fastify.prisma.payment.create({
      data: {
        paymentNo: `PAY${Date.now()}`,
        orderId: order.id,
        userId: order.buyerId,
        amount: payload.amount,
        status: payload.status,
        paidAt: payload.status === 'PAID' ? new Date() : null,
        note: payload.note || null
      },
      include: includePayment
    });
    return ok(reply, payment, '结算记录已创建');
  });

  fastify.put('/:id', { preHandler: requireAnyRole(['FINANCE', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(updateSchema, request.body);
    const current = await fastify.prisma.payment.findUnique({ where: { id: params.id } });
    if (!current) throw fail('结算记录不存在', 404);
    const payment = await fastify.prisma.payment.update({
      where: { id: params.id },
      data: {
        amount: payload.amount,
        status: payload.status,
        paidAt: payload.status === 'PAID' ? new Date() : payload.status ? null : undefined,
        note: payload.note === undefined ? undefined : payload.note
      },
      include: includePayment
    });
    return ok(reply, payment, '结算记录已更新');
  });

  fastify.delete('/:id', { preHandler: requireAnyRole(['FINANCE', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    await fastify.prisma.payment.delete({ where: { id: params.id } });
    return ok(reply, null, '结算记录已删除');
  });
}
