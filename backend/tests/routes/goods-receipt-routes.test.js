import Fastify from 'fastify';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import goodsReceiptRoutes from '../../src/routes/goods-receipt-routes.js';

const poId = '11111111-1111-4111-8111-111111111111';
const poLineId = '22222222-2222-4222-8222-222222222222';
const prLineId = '33333333-3333-4333-8333-333333333333';
const missingId = '44444444-4444-4444-8444-444444444444';

let app;

function createTestApp() {
  const state = { receipt: null, lines: [], poQtyReceived: 0, prQtyReceived: 0 };
  const client = {
    query: jest.fn(async (sql, params = []) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK'
        || sql.startsWith('LOCK TABLE')) return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) {
        return { rows: [{ id: poId, po_number: 'PO-2026-0001', status: 'SUBMITTED' }], rowCount: 1 };
      }
      if (sql.includes('FROM goods_receipts gr')) {
        return state.receipt
          ? { rows: [{ ...state.receipt, po_status: 'SUBMITTED' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (sql.includes('FROM po_lines')) {
        return {
          rows: [{ id: poLineId, qty_ordered: 10, qty_received: state.poQtyReceived }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM gr_lines')) return { rows: state.lines, rowCount: state.lines.length };
      if (sql.includes('FROM pr_line_allocations')) {
        return { rows: [{ pr_line_id: prLineId }], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO goods_receipts')) {
        state.receipt = {
          id: params[0], gr_number: params[1], po_id: params[2], status: 'DRAFT',
          receipt_date: params[3], notes: params[4],
          created_at: '2026-10-13T10:00:00.000Z', updated_at: '2026-10-13T10:00:00.000Z',
          po_number: 'PO-2026-0001',
        };
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO gr_lines')) {
        state.lines.push({
          id: params[0], gr_id: params[1], po_line_id: params[2], line_no: params[3],
          qty_received: params[4], actual_site_code: params[5], item_code: 'ITEM-1',
          item_name: 'Safety Helmet', site_code: 'WH-JKT', uom: 'PCS',
        });
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE po_lines')) {
        state.poQtyReceived += Number(params[0]);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE pr_lines')) {
        state.prQtyReceived += Number(params[0]);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE goods_receipts')) {
        state.receipt.status = 'POSTED';
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }], rowCount: 1 };
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };

  const db = {
    pool: { connect: jest.fn(async () => client) },
    query: jest.fn(async (sql, params = []) => {
      if (sql.includes('FROM goods_receipts gr')) {
        if (sql.includes('WHERE gr.id')) {
          return state.receipt && state.receipt.id === params[0]
            ? { rows: [state.receipt], rowCount: 1 }
            : { rows: [], rowCount: 0 };
        }
        return { rows: state.receipt ? [state.receipt] : [], rowCount: state.receipt ? 1 : 0 };
      }
      if (sql.includes('FROM gr_lines gl')) {
        return { rows: state.lines, rowCount: state.lines.length };
      }
      throw new Error(`Unexpected db query: ${sql}`);
    }),
  };

  app = Fastify();
  app.decorate('db', db);
  app.register(goodsReceiptRoutes);
  return { app, db, state };
}

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe('goods receipt routes', () => {
  test('creates, lists, details, and posts a receipt', async () => {
    const { app: server, state } = createTestApp();
    const created = await server.inject({
      method: 'POST',
      url: '/api/goods-receipts',
      payload: {
        poId,
        receiptDate: '2026-10-13',
        lines: [{ poLineId, qtyReceived: 3, actualSiteCode: 'WH-JKT' }],
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().status).toBe('DRAFT');
    const receiptId = created.json().id;

    const listed = await server.inject({ method: 'GET', url: '/api/goods-receipts' });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().items).toHaveLength(1);

    const detail = await server.inject({ method: 'GET', url: `/api/goods-receipts/${receiptId}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().lines[0].qtyReceived).toBe(3);

    const posted = await server.inject({ method: 'POST', url: `/api/goods-receipts/${receiptId}/post` });
    expect(posted.statusCode).toBe(200);
    expect(posted.json().status).toBe('POSTED');
    expect(state.poQtyReceived).toBe(3);
    expect(state.prQtyReceived).toBe(3);
  });

  test('maps validation and missing receipt errors to JSON responses', async () => {
    const { app: server, db } = createTestApp();
    const invalidCreate = await server.inject({
      method: 'POST',
      url: '/api/goods-receipts',
      payload: { poId, lines: [] },
    });
    expect(invalidCreate.statusCode).toBe(422);
    expect(invalidCreate.json()).toEqual({ message: 'lines must contain at least one item' });
    expect(db.pool.connect).not.toHaveBeenCalled();

    const missingDetail = await server.inject({ method: 'GET', url: `/api/goods-receipts/${missingId}` });
    expect(missingDetail.statusCode).toBe(404);
    expect(missingDetail.json()).toEqual({ message: 'Goods receipt not found' });

    const missingPost = await server.inject({ method: 'POST', url: `/api/goods-receipts/${missingId}/post` });
    expect(missingPost.statusCode).toBe(404);
    expect(missingPost.json()).toEqual({ message: 'Goods receipt not found' });
  });
});