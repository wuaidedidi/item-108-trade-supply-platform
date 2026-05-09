import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ok, fail } from '../lib/response.js';
import { optionalEmail, optionalPhone, validate } from '../lib/schemas.js';

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  status: true,
  email: true,
  phone: true,
  quota: true,
  createdAt: true
};

const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码')
});

const registerSchema = z.object({
  username: z.string().trim().min(3, '用户名至少3个字符').max(32, '用户名不能超过32个字符'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().trim().min(2, '请输入姓名').max(40, '姓名不能超过40个字符'),
  email: optionalEmail,
  phone: optionalPhone
});

const profileSchema = z.object({
  name: z.string().trim().min(2, '请输入姓名').max(40, '姓名不能超过40个字符'),
  email: optionalEmail,
  phone: optionalPhone
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6位')
});

export default async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const payload = validate(loginSchema, request.body);
    const user = await fastify.prisma.user.findUnique({ where: { username: payload.username } });
    if (!user || user.status !== 'ACTIVE') {
      throw fail('用户名或密码不正确', 401);
    }
    const matched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!matched) {
      throw fail('用户名或密码不正确', 401);
    }
    const token = fastify.jwt.sign({ sub: String(user.id), role: user.role }, { expiresIn: '12h' });
    const current = await fastify.prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
    return ok(reply, { token, user: current }, '登录成功');
  });

  fastify.post('/register', async (request, reply) => {
    const payload = validate(registerSchema, request.body);
    const existed = await fastify.prisma.user.findUnique({ where: { username: payload.username } });
    if (existed) {
      throw fail('用户名已存在', 409);
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await fastify.prisma.user.create({
      data: {
        username: payload.username,
        passwordHash,
        name: payload.name,
        role: 'USER',
        status: 'ACTIVE',
        email: payload.email,
        phone: payload.phone
      },
      select: publicUserSelect
    });
    return ok(reply, user, '注册成功');
  });

  fastify.get('/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({ where: { id: request.user.id }, select: publicUserSelect });
    return ok(reply, user);
  });

  fastify.put('/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    const payload = validate(profileSchema, request.body);
    const user = await fastify.prisma.user.update({
      where: { id: request.user.id },
      data: payload,
      select: publicUserSelect
    });
    return ok(reply, user, '个人资料已更新');
  });

  fastify.put('/me/password', { preHandler: fastify.authenticate }, async (request, reply) => {
    const payload = validate(passwordSchema, request.body);
    const user = await fastify.prisma.user.findUnique({ where: { id: request.user.id } });
    const matched = await bcrypt.compare(payload.oldPassword, user.passwordHash);
    if (!matched) {
      throw fail('原密码不正确', 400);
    }
    await fastify.prisma.user.update({
      where: { id: request.user.id },
      data: { passwordHash: await bcrypt.hash(payload.newPassword, 10) }
    });
    return ok(reply, null, '密码已更新');
  });
}
