import fp from 'fastify-plugin';
import { fail } from './response.js';

const roleRanks = {
  USER: 1,
  SUPPLIER: 2,
  AUDITOR: 3,
  FINANCE: 4,
  ADMIN: 5
};

export function canSeeAll(role) {
  return ['ADMIN', 'AUDITOR', 'FINANCE'].includes(role);
}

export function requireAnyRole(roles) {
  return async function guard(request) {
    await request.jwtVerify();
    if (!roles.includes(request.user.role)) {
      throw fail('当前账号无权执行该操作', 403);
    }
  };
}

export function requireMinRole(role) {
  return async function guard(request) {
    await request.jwtVerify();
    if ((roleRanks[request.user.role] || 0) < (roleRanks[role] || 0)) {
      throw fail('当前账号无权执行该操作', 403);
    }
  };
}

export default fp(async function authPlugin(fastify) {
  fastify.decorate('authenticate', async function authenticate(request) {
    await request.jwtVerify();
    const user = await fastify.prisma.user.findUnique({
      where: { id: Number(request.user.sub) },
      select: { id: true, username: true, name: true, role: true, status: true, email: true, phone: true, quota: true }
    });
    if (!user || user.status !== 'ACTIVE') {
      throw fail('账号不可用，请联系管理员', 401);
    }
    request.currentUser = user;
    request.user = { ...request.user, ...user };
  });
});
