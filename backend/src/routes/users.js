import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, optionalEmail, optionalPhone, validate } from '../lib/schemas.js';

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  status: true,
  email: true,
  phone: true,
  quota: true,
  createdAt: true,
  updatedAt: true
};

const userCreateSchema = z.object({
  username: z.string().trim().min(3, '用户名至少3个字符').max(32, '用户名不能超过32个字符'),
  password: z.string().min(6, '密码至少6位').default('123456'),
  name: z.string().trim().min(2, '请输入姓名').max(40, '姓名不能超过40个字符'),
  role: z.enum(['USER', 'SUPPLIER', 'AUDITOR', 'FINANCE', 'ADMIN'], { message: '角色不正确' }).default('USER'),
  status: z.enum(['ACTIVE', 'DISABLED'], { message: '状态不正确' }).default('ACTIVE'),
  email: optionalEmail,
  phone: optionalPhone,
  quota: z.coerce.number().min(0, '额度不能小于0').default(50000)
});

const userUpdateSchema = userCreateSchema.omit({ username: true, password: true }).partial();

export default async function userRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', { preHandler: requireAnyRole(['ADMIN', 'AUDITOR', 'FINANCE']) }, async (request, reply) => {
    const query = validate(listQuerySchema.extend({ role: z.string().optional().default('') }), request.query);
    const where = {
      AND: [
        query.keyword
          ? {
              OR: [
                { username: { contains: query.keyword } },
                { name: { contains: query.keyword } },
                { phone: { contains: query.keyword } }
              ]
            }
          : {},
        query.role ? { role: query.role } : {},
        query.status ? { status: query.status } : {}
      ]
    };
    const [items, total] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { id: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.user.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.post('/', { preHandler: requireAnyRole(['ADMIN']) }, async (request, reply) => {
    const payload = validate(userCreateSchema, request.body);
    const existed = await fastify.prisma.user.findUnique({ where: { username: payload.username } });
    if (existed) throw fail('用户名已存在', 409);
    const { password, ...userData } = payload;
    const user = await fastify.prisma.user.create({
      data: { ...userData, passwordHash: await bcrypt.hash(password, 10) },
      select: userSelect
    });
    return ok(reply, user, '用户已创建');
  });

  fastify.put('/:id', { preHandler: requireAnyRole(['ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(userUpdateSchema, request.body);
    if (params.id === request.user.id && payload.role && payload.role !== request.user.role) {
      throw fail('不能修改自己的角色', 400);
    }
    if (params.id === request.user.id && payload.status === 'DISABLED') {
      throw fail('不能禁用自己的账号', 400);
    }
    const user = await fastify.prisma.user.update({ where: { id: params.id }, data: payload, select: userSelect });
    return ok(reply, user, '用户已更新');
  });

  fastify.delete('/:id', { preHandler: requireAnyRole(['ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    if (params.id === request.user.id) throw fail('不能删除自己的账号', 400);
    const [orders, products, applications] = await Promise.all([
      fastify.prisma.order.count({ where: { OR: [{ buyerId: params.id }, { supplierId: params.id }] } }),
      fastify.prisma.product.count({ where: { supplierId: params.id } }),
      fastify.prisma.application.count({ where: { applicantId: params.id } })
    ]);
    if (orders > 0) throw fail(`该用户关联 ${orders} 笔订单，无法删除`, 400);
    if (products > 0) throw fail(`该供应方维护了 ${products} 个商品，无法删除`, 400);
    if (applications > 0) throw fail(`该用户关联 ${applications} 条申请，无法删除`, 400);
    await fastify.prisma.user.delete({ where: { id: params.id } });
    return ok(reply, null, '用户已删除');
  });
}
