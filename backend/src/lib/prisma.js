import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

export default fp(async function prismaPlugin(fastify) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ]
  });

  prisma.$on('error', (event) => fastify.log.error({ module: 'prisma', event }, '数据库错误'));
  prisma.$on('warn', (event) => fastify.log.warn({ module: 'prisma', event }, '数据库警告'));

  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
