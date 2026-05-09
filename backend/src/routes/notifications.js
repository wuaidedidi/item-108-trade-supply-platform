import { z } from 'zod';
import { ok, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

export default async function notificationRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema.extend({ isRead: z.string().optional().default('') }), request.query);
    const where = {
      AND: [
        { userId: request.user.id },
        query.keyword ? { OR: [{ title: { contains: query.keyword } }, { content: { contains: query.keyword } }] } : {},
        query.isRead === 'true' ? { isRead: true } : query.isRead === 'false' ? { isRead: false } : {}
      ]
    };
    const [items, total, unread] = await Promise.all([
      fastify.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.notification.count({ where }),
      fastify.prisma.notification.count({ where: { userId: request.user.id, isRead: false } })
    ]);
    return ok(reply, { ...pageResult(items, total, query.page, query.pageSize), unread });
  });

  fastify.put('/:id/read', async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    await fastify.prisma.notification.updateMany({ where: { id: params.id, userId: request.user.id }, data: { isRead: true } });
    return ok(reply, null, '消息已读');
  });

  fastify.put('/read-all', async (request, reply) => {
    await fastify.prisma.notification.updateMany({ where: { userId: request.user.id, isRead: false }, data: { isRead: true } });
    return ok(reply, null, '全部消息已读');
  });
}
