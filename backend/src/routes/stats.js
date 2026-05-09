import { canSeeAll } from '../lib/auth.js';
import { ok } from '../lib/response.js';

function visibleOrderWhere(user) {
  if (user.role === 'USER') return { buyerId: user.id };
  if (user.role === 'SUPPLIER') return { supplierId: user.id };
  return {};
}

export default async function statsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/dashboard', async (request, reply) => {
    const orderScope = visibleOrderWhere(request.user);
    const [
      orderTotal,
      completedTotal,
      refundedTotal,
      reviewAgg,
      inventoryAgg,
      pendingApplications,
      unpaidPayments,
      unreadNotifications,
      recentOrders,
      productCount
    ] = await Promise.all([
      fastify.prisma.order.count({ where: orderScope }),
      fastify.prisma.order.count({ where: { ...orderScope, status: 'COMPLETED' } }),
      fastify.prisma.order.count({ where: { ...orderScope, status: 'REFUNDED' } }),
      fastify.prisma.review.aggregate({
        _avg: { rating: true },
        where: request.user.role === 'SUPPLIER' ? { product: { is: { supplierId: request.user.id } } } : canSeeAll(request.user.role) ? {} : { userId: request.user.id }
      }),
      fastify.prisma.inventory.aggregate({
        _avg: { turnoverMonthly: true },
        where: request.user.role === 'SUPPLIER' ? { product: { is: { supplierId: request.user.id } } } : {}
      }),
      fastify.prisma.application.count({ where: canSeeAll(request.user.role) ? { status: 'PENDING' } : { applicantId: request.user.id, status: 'PENDING' } }),
      fastify.prisma.payment.count({ where: canSeeAll(request.user.role) ? { status: 'UNPAID' } : { userId: request.user.id, status: 'UNPAID' } }),
      fastify.prisma.notification.count({ where: { userId: request.user.id, isRead: false } }),
      fastify.prisma.order.findMany({
        where: orderScope,
        include: {
          product: { select: { name: true } },
          buyer: { select: { name: true } },
          supplier: { select: { name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 6
      }),
      fastify.prisma.product.count({ where: request.user.role === 'SUPPLIER' ? { supplierId: request.user.id } : {} })
    ]);

    const statusGroups = await fastify.prisma.order.groupBy({
      by: ['status'],
      where: orderScope,
      _count: { status: true }
    });

    const paymentAgg = await fastify.prisma.payment.aggregate({
      _sum: { amount: true },
      where: canSeeAll(request.user.role) ? {} : { userId: request.user.id }
    });

    return ok(reply, {
      metrics: {
        orderTotal,
        dealRate: orderTotal ? Number(((completedTotal / orderTotal) * 100).toFixed(1)) : 0,
        refundRate: orderTotal ? Number(((refundedTotal / orderTotal) * 100).toFixed(1)) : 0,
        averageRating: Number((reviewAgg._avg.rating || 0).toFixed(1)),
        inventoryTurnover: Number((Number(inventoryAgg._avg.turnoverMonthly) || 0).toFixed(1)),
        pendingApplications,
        unpaidPayments,
        unreadNotifications,
        productCount,
        settlementAmount: Number(paymentAgg._sum.amount || 0)
      },
      statusGroups: statusGroups.map((item) => ({ status: item.status, count: item._count.status })),
      recentOrders
    });
  });
}
