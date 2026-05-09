import { z } from 'zod';
import { canSeeAll, requireAnyRole } from '../lib/auth.js';
import { ok, fail, pageResult } from '../lib/response.js';
import { idParamSchema, listQuerySchema, validate } from '../lib/schemas.js';

const updateSchema = z.object({
  quantity: z.coerce.number().int().min(0, '库存不能小于0'),
  reserved: z.coerce.number().int().min(0, '占用库存不能小于0'),
  warningLevel: z.coerce.number().int().min(0, '预警值不能小于0'),
  turnoverMonthly: z.coerce.number().min(0, '周转率不能小于0')
});

export default async function inventoryRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const query = validate(listQuerySchema, request.query);
    const productWhere = {
      AND: [
        query.keyword ? { OR: [{ name: { contains: query.keyword } }, { category: { contains: query.keyword } }] } : {},
        request.user.role === 'SUPPLIER' ? { supplierId: request.user.id } : {}
      ]
    };
    const where = { product: { is: productWhere } };
    const [items, total] = await Promise.all([
      fastify.prisma.inventory.findMany({
        where,
        include: { product: { include: { supplier: { select: { id: true, name: true } } } } },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      fastify.prisma.inventory.count({ where })
    ]);
    return ok(reply, pageResult(items, total, query.page, query.pageSize));
  });

  fastify.put('/:id', { preHandler: requireAnyRole(['SUPPLIER', 'ADMIN']) }, async (request, reply) => {
    const params = validate(idParamSchema, request.params);
    const payload = validate(updateSchema, request.body);
    if (payload.reserved > payload.quantity) throw fail('占用库存不能大于总库存', 400);
    const current = await fastify.prisma.inventory.findUnique({ where: { id: params.id }, include: { product: true } });
    if (!current) throw fail('库存记录不存在', 404);
    if (!canSeeAll(request.user.role) && current.product.supplierId !== request.user.id) throw fail('无权调整该库存', 403);
    const inventory = await fastify.prisma.inventory.update({
      where: { id: params.id },
      data: payload,
      include: { product: { include: { supplier: { select: { id: true, name: true } } } } }
    });
    return ok(reply, inventory, '库存已更新');
  });
}
