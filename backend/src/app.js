import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dbPlugin from './plugins/db.js';
import requisitionRoutes from './routes/requisition-routes.js';
import purchaseOrderRoutes from './routes/purchase-order-routes.js';
import goodsReceiptRoutes from './routes/goods-receipt-routes.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Procurement MVP API',
        description: 'API for purchase requisitions, purchase orders, and goods receipts.',
        version: '1.0.0',
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix: '/api-docs',
  });

  app.register(dbPlugin);
  app.register(requisitionRoutes);
  app.register(purchaseOrderRoutes);
  app.register(goodsReceiptRoutes);

  app.get('/health', {
    schema: {
      summary: 'Check API health',
      tags: ['Health'],
    },
  }, async () => ({ status: 'ok' }));

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (reply.sent) {
      return;
    }

    reply.code(500).send({ message: 'Internal server error' });
  });

  return app;
}
