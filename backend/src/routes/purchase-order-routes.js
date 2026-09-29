import {
  createPurchaseOrder,
  getOpenPoLines,
  getPurchaseOrderById,
  listPurchaseOrders,
  submitPurchaseOrder,
} from '../services/purchase-order-service.js';

export default async function purchaseOrderRoutes(fastify) {
  fastify.get('/api/purchase-orders', { schema: { tags: ['purchase-orders'] } }, async (request, reply) => {
    const items = await listPurchaseOrders(fastify.db);
    return { items };
  });

  fastify.post('/api/purchase-orders', { schema: { tags: ['purchase-orders'] } }, async (request, reply) => {
    try {
      const purchaseOrder = await createPurchaseOrder(fastify.db, request.body);
      reply.code(201);
      return purchaseOrder;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.post('/api/purchase-orders/:id/submit', { schema: { tags: ['purchase-orders'] } }, async (request, reply) => {
    try {
      const purchaseOrder = await submitPurchaseOrder(fastify.db, request.params.id);
      if (!purchaseOrder) {
        reply.code(404);
        return { message: 'Purchase order not found' };
      }

      return purchaseOrder;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.get('/api/purchase-orders/:id', { schema: { tags: ['purchase-orders'] } }, async (request, reply) => {
    const purchaseOrder = await getPurchaseOrderById(fastify.db, request.params.id);
    if (!purchaseOrder) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return purchaseOrder;
  });

  fastify.get('/api/purchase-orders/:id/open-lines', { schema: { tags: ['purchase-orders'] } }, async (request, reply) => {
    const payload = await getOpenPoLines(fastify.db, request.params.id);
    if (!payload) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return payload;
  });
}
