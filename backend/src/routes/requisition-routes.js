import {
  approveRequisition,
  createRequisition,
  getRequisitionById,
  getRequisitionOpenLines,
  listRequisitions,
  submitRequisition,
} from '../services/requisition-service.js';

export default async function requisitionRoutes(fastify) {
  fastify.get('/api/requisitions', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    const items = await listRequisitions(fastify.db);
    return { items };
  });

  fastify.post('/api/requisitions', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    try {
      const requisition = await createRequisition(fastify.db, request.body);
      reply.code(201);
      return requisition;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.post('/api/requisitions/:id/submit', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    try {
      const requisition = await submitRequisition(fastify.db, request.params.id);
      if (!requisition) {
        reply.code(404);
        return { message: 'Requisition not found' };
      }

      return requisition;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.post('/api/requisitions/:id/approve', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    try {
      const requisition = await approveRequisition(fastify.db, request.params.id);
      if (!requisition) {
        reply.code(404);
        return { message: 'Requisition not found' };
      }

      return requisition;
    } catch (error) {
      if (error.statusCode) {
        reply.code(error.statusCode);
        return { message: error.message };
      }

      throw error;
    }
  });

  fastify.get('/api/requisitions/:id', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    const requisition = await getRequisitionById(fastify.db, request.params.id);
    if (!requisition) {
      reply.code(404);
      return { message: 'Requisition not found' };
    }

    return requisition;
  });

  fastify.get('/api/requisitions/:id/open-lines', { schema: { tags: ['requisitions'] } }, async (request, reply) => {
    const payload = await getRequisitionOpenLines(fastify.db, request.params.id);
    if (!payload) {
      reply.code(404);
      return { message: 'Requisition not found' };
    }

    return payload;
  });
}
