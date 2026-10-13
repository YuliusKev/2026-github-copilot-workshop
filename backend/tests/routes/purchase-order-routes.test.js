import Fastify from 'fastify';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import purchaseOrderRoutes from '../../src/routes/purchase-order-routes.js';

const bookmarkedPoId = '11111111-1111-4111-8111-111111111111';
const unbookmarkedPoId = '22222222-2222-4222-8222-222222222222';
const missingPoId = '33333333-3333-4333-8333-333333333333';

let app;

function createTestApp() {
  const purchaseOrders = new Map([
    [bookmarkedPoId, { id: bookmarkedPoId, po_number: 'PO-2026-0001', status: 'DRAFT', vendor_name: 'PT Maju', is_bookmarked: false }],
    [unbookmarkedPoId, { id: unbookmarkedPoId, po_number: 'PO-2026-0002', status: 'SUBMITTED', vendor_name: 'PT Jaya', is_bookmarked: false }],
  ]);

  const db = {
    query: jest.fn(async (sql, params = []) => {
      if (sql.includes('SET is_bookmarked')) {
        const purchaseOrder = purchaseOrders.get(params[0]);
        if (!purchaseOrder) return { rows: [], rowCount: 0 };
        purchaseOrder.is_bookmarked = params[1];
        return {
          rows: [{ id: purchaseOrder.id, is_bookmarked: purchaseOrder.is_bookmarked }],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM purchase_orders WHERE id')) {
        const purchaseOrder = purchaseOrders.get(params[0]);
        return {
          rows: purchaseOrder ? [{
            ...purchaseOrder,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          }] : [],
          rowCount: purchaseOrder ? 1 : 0,
        };
      }

      if (sql.includes('FROM po_lines')) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('FROM purchase_orders')) {
        const rows = [...purchaseOrders.values()]
          .filter((purchaseOrder) => !sql.includes('WHERE is_bookmarked = TRUE') || purchaseOrder.is_bookmarked)
          .map((purchaseOrder) => ({
            ...purchaseOrder,
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          }));
        return { rows, rowCount: rows.length };
      }

      throw new Error(`Unexpected query: ${sql}`);
    }),
  };

  const fastify = Fastify();
  fastify.decorate('db', db);
  fastify.register(purchaseOrderRoutes);
  return fastify;
}

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe('purchase order bookmark routes', () => {
  test('bookmark and unbookmark operations are idempotent', async () => {
    app = createTestApp();

    const firstBookmark = await app.inject({ method: 'POST', url: `/api/purchase-orders/${bookmarkedPoId}/bookmark` });
    const repeatedBookmark = await app.inject({ method: 'POST', url: `/api/purchase-orders/${bookmarkedPoId}/bookmark` });
    const firstRemoval = await app.inject({ method: 'DELETE', url: `/api/purchase-orders/${bookmarkedPoId}/bookmark` });
    const repeatedRemoval = await app.inject({ method: 'DELETE', url: `/api/purchase-orders/${bookmarkedPoId}/bookmark` });

    expect(firstBookmark.statusCode).toBe(200);
    expect(firstBookmark.json()).toEqual({ id: bookmarkedPoId, isBookmarked: true });
    expect(repeatedBookmark.json()).toEqual({ id: bookmarkedPoId, isBookmarked: true });
    expect(firstRemoval.json()).toEqual({ id: bookmarkedPoId, isBookmarked: false });
    expect(repeatedRemoval.json()).toEqual({ id: bookmarkedPoId, isBookmarked: false });
  });

  test('bookmark operations return 404 for a missing PO', async () => {
    app = createTestApp();

    const response = await app.inject({ method: 'POST', url: `/api/purchase-orders/${missingPoId}/bookmark` });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Purchase order not found' });
  });

  test('list filtering and detail responses include bookmark state', async () => {
    app = createTestApp();
    await app.inject({ method: 'POST', url: `/api/purchase-orders/${bookmarkedPoId}/bookmark` });

    const allOrders = await app.inject({ method: 'GET', url: '/api/purchase-orders' });
    const bookmarkedOrders = await app.inject({ method: 'GET', url: '/api/purchase-orders?bookmarked=true' });
    const detail = await app.inject({ method: 'GET', url: `/api/purchase-orders/${bookmarkedPoId}` });

    expect(allOrders.json().items).toHaveLength(2);
    expect(allOrders.json().items[0]).toHaveProperty('isBookmarked', true);
    expect(bookmarkedOrders.json().items).toHaveLength(1);
    expect(bookmarkedOrders.json().items[0]).toHaveProperty('id', bookmarkedPoId);
    expect(detail.json()).toHaveProperty('isBookmarked', true);
  });
});