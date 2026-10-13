import {
  createPurchaseOrder,
  getOpenPoLines,
  getPurchaseOrderById,
  listPurchaseOrders,
  setPurchaseOrderBookmarked,
  submitPurchaseOrder,
} from '../services/purchase-order-service.js';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

export default async function purchaseOrderRoutes(fastify) {
  fastify.get('/api/purchase-orders', {
    schema: { summary: 'List purchase orders', tags: ['Purchase Orders'] },
  }, async (request, reply) => {
    const items = await listPurchaseOrders(fastify.db, request.query.bookmarked === 'true');
    return { items };
  });

  fastify.post('/api/purchase-orders/:id/bookmark', {
    schema: {
      summary: 'Bookmark a purchase order',
      tags: ['Purchase Orders'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    const result = await setPurchaseOrderBookmarked(fastify.db, request.params.id, true);
    if (!result) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return result;
  });

  fastify.delete('/api/purchase-orders/:id/bookmark', {
    schema: {
      summary: 'Remove a purchase order bookmark',
      tags: ['Purchase Orders'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    const result = await setPurchaseOrderBookmarked(fastify.db, request.params.id, false);
    if (!result) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return result;
  });

  fastify.post('/api/purchase-orders', {
    schema: { summary: 'Create a purchase order', tags: ['Purchase Orders'] },
  }, async (request, reply) => {
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

  fastify.post('/api/purchase-orders/:id/submit', {
    schema: {
      summary: 'Submit a purchase order',
      tags: ['Purchase Orders'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
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

  fastify.get('/api/purchase-orders/:id', {
    schema: {
      summary: 'Get a purchase order',
      tags: ['Purchase Orders'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    const purchaseOrder = await getPurchaseOrderById(fastify.db, request.params.id);
    if (!purchaseOrder) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return purchaseOrder;
  });

  fastify.get('/api/purchase-orders/:id/open-lines', {
    schema: {
      summary: 'Get open goods receipt lines for a purchase order',
      tags: ['Purchase Orders'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    const payload = await getOpenPoLines(fastify.db, request.params.id);
    if (!payload) {
      reply.code(404);
      return { message: 'Purchase order not found' };
    }

    return payload;
  });
}
