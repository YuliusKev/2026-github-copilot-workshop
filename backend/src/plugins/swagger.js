import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

async function swaggerPlugin(fastify) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Procurement MVP API',
        description: 'API documentation for the Purchase Requisition, Purchase Order and Goods Receipt modules.',
        version: '1.0.0',
      },
      tags: [
        { name: 'requisitions', description: 'Purchase Requisition endpoints' },
        { name: 'purchase-orders', description: 'Purchase Order endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/api-docs',
  });
}

export default fp(swaggerPlugin);
