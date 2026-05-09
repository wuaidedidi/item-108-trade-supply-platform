import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prismaPlugin from './lib/prisma.js';
import authPlugin from './lib/auth.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import applicationRoutes from './routes/applications.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import inventoryRoutes from './routes/inventory.js';
import notificationRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' }
  }
});

await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: '交易与供需协同平台 API',
      version: '1.0.0',
      description: '商品、订单、申请、结算、评价、库存与通知的业务接口'
    }
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs'
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'trade-supply-platform-secret'
});
await fastify.register(prismaPlugin);
await fastify.register(authPlugin);

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
await fastify.register(fastifyStatic, {
  root: clientDist,
  prefix: '/',
  index: false
});

fastify.get('/health', async (_, reply) => reply.send({ code: 200, message: 'ok', data: { status: 'up' } }));

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(userRoutes, { prefix: '/api/users' });
await fastify.register(productRoutes, { prefix: '/api/products' });
await fastify.register(orderRoutes, { prefix: '/api/orders' });
await fastify.register(applicationRoutes, { prefix: '/api/applications' });
await fastify.register(paymentRoutes, { prefix: '/api/payments' });
await fastify.register(reviewRoutes, { prefix: '/api/reviews' });
await fastify.register(inventoryRoutes, { prefix: '/api/inventory' });
await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
await fastify.register(statsRoutes, { prefix: '/api/stats' });

fastify.setErrorHandler((error, request, reply) => {
  request.log.error({ error }, error.message);
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  const message = statusCode >= 500 ? '服务器错误，请稍后重试' : error.message;
  reply.status(statusCode).send({ code: error.code || statusCode, message, data: null });
});

fastify.setNotFoundHandler((request, reply) => {
  const url = request.raw.url || '';
  if (url.startsWith('/api/') || url.startsWith('/docs') || url.startsWith('/json')) {
    return reply.callNotFound();
  }
  return reply.type('text/html').sendFile('index.html');
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT || 8080), host: '0.0.0.0' });
  } catch (error) {
    fastify.log.error({ error }, '服务启动失败');
    process.exit(1);
  }
};

start();
