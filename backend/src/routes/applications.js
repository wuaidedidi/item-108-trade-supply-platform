import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const includeApplication = {
  applicant: { select: { id: true, name: true, username: true, role: true } },
  reviewer: { select: { id: true, name: true, username: true } }
};

const createSchema = z.object({
  title: z.string().trim().min(3, '请输入申请标题').max(80, '申请标题不能超过80个字符'),
  type: z.enum(['PURCHASE', 'QUOTA', 'REIMBURSEMENT'], { message: '申请类型不正确' }),
  amount: z.coerce.number().positive('申请金额必须大于0'),
  reason: z.string().trim().min(5, '请输入申请原因')
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: '审核结果不正确' }),
  comment: z.string().trim().min(2, '请输入审核意见').max(200, '审核意见不能超过200个字符')
});

export default async function applicationRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema.extend({ type: z.string().optional().default('') }), request.query);
    const where = {
      AND: [
        query.keyword ? { OR: [{ title: { contains: query.keyword } }, { reason: { contains: query.keyword } }] } : {},
        query.status ? { status: query.status } : {},
        query.type ? { type: query.type } : {},
        canSeeAll(request.user.role) ? {} : { applicantId: request.user.id }
      ]
    };
    const [items, total] = await Promise.all([
      fastify.prisma.application.findMany({
        where,
        include: includeApplication,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.application.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.post('/', async (request, reply) => {
    const payload = validate(createSchema, request.body);
    const application = await fastify.prisma.application.create({
      data: { ...payload, applicantId: request.user.id, status: 'PENDING' },
      include: includeApplication
    });
    const reviewers = await fastify.prisma.user.findMany({ where: { role: { in: ['AUDITOR', 'ADMIN'] }, status: 'ACTIVE' }, select: { id: true } });
    await fastify.prisma.notification.createMany({
      data: reviewers.map((user) => ({ userId: user.id, type: 'APPLICATION', title: '有新的申请待审核', content: `${request.user.name} 提交了「${payload.title}」。` }))
    });
    return ok(reply, application, '申请已提交');
  });

  fastify.put('/:id/review', { preHandler: requireAnyRole(['AUDITOR', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(reviewSchema, request.body);
    const current = await fastify.prisma.application.findUnique({ where: { id: params.id } });
    if (!current) throw fail('申请不存在', 404);
    if (current.status !== 'PENDING') throw fail('该申请已处理，不能重复审核', 400);
    const application = await fastify.prisma.application.update({
      where: { id: params.id },
      data: { status: payload.status, comment: payload.comment, reviewerId: request.user.id },
      include: includeApplication
    });
    await fastify.prisma.notification.create({
      data: {
        userId: current.applicantId,
        type: 'APPLICATION',
        title: payload.status === 'APPROVED' ? '申请已通过' : '申请已驳回',
        content: payload.comment
      }
    });
    return ok(reply, application, '审核已提交');
  });

  fastify.delete('/:id', async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const current = await fastify.prisma.application.findUnique({ where: { id: params.id } });
    if (!current) throw fail('申请不存在', 404);
    if (!canSeeAll(request.user.role) && current.applicantId !== request.user.id) throw fail('无权删除该申请', 403);
    if (current.status !== 'PENDING' && !canSeeAll(request.user.role)) throw fail('已审核的申请不能删除', 400);
    await fastify.prisma.application.delete({ where: { id: params.id } });
    return ok(reply, null, '申请已删除');
  });
}
