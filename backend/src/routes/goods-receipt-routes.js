import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
} from '../services/goods-receipt-service.js';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

export default async function goodsReceiptRoutes(fastify) {
  fastify.get('/api/goods-receipts', {
    schema: { summary: 'List goods receipts', tags: ['Goods Receipts'] },
  }, async () => ({ items: await listGoodsReceipts(fastify.db) }));

  fastify.post('/api/goods-receipts', {
    schema: { summary: 'Create a goods receipt', tags: ['Goods Receipts'] },
  }, async (request, reply) => {
    try {
      const receipt = await createGoodsReceipt(fastify.db, request.body);
      reply.code(201);
      return receipt;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.get('/api/goods-receipts/:id', {
    schema: {
      summary: 'Get a goods receipt',
      tags: ['Goods Receipts'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    const receipt = await getGoodsReceiptById(fastify.db, request.params.id);
    if (!receipt) {
      reply.code(404);
      return { message: 'Goods receipt not found' };
    }

    return receipt;
  });

  fastify.post('/api/goods-receipts/:id/post', {
    schema: {
      summary: 'Post a goods receipt',
      tags: ['Goods Receipts'],
      params: idParamsSchema,
    },
  }, async (request, reply) => {
    try {
      const receipt = await postGoodsReceipt(fastify.db, request.params.id);
      if (!receipt) {
        reply.code(404);
        return { message: 'Goods receipt not found' };
      }

      return receipt;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });
}