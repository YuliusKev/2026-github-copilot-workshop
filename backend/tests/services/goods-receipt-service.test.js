import { jest, describe, test, expect } from '@jest/globals';
import {
  createGoodsReceipt,
  postGoodsReceipt,
  distributeReceiptAcrossAllocations,
} from '../../src/services/goods-receipt-service.js';

// ── Helpers ──────────────────────────────────────────────

/**
 * Build a valid GR creation payload.
 * Override any field by passing partial objects.
 */
function validPayload(overrides = {}) {
  return {
    poId: 'po-id',
    lines: [
      { poLineId: 'po-line-1', qtyReceived: 8, actualSiteCode: 'WH-JKT' },
    ],
    ...overrides,
  };
}

/**
 * Create a mock DB client returned by pool.connect().
 * `queryResponses` is a function(sql, params) => { rows, rowCount }.
 */
function mockClient(queryResponses) {
  return {
    query: jest.fn((sql, params) => queryResponses(sql, params)),
    release: jest.fn(),
  };
}

/**
 * Create a mock db object with pool.connect() and db.query().
 */
function mockDb(client, queryFn) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(queryFn || (() => ({ rows: [], rowCount: 0 }))),
  };
}

/**
 * Standard client responses for a successful GR creation:
 *   BEGIN → PO SELECT FOR UPDATE → PO line SELECT FOR UPDATE → GR count →
 *   INSERT header → INSERT line → COMMIT
 */
function createHappyPathClientResponses() {
  return (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('FROM purchase_orders')) {
      return { rows: [{ id: 'po-id', status: 'SUBMITTED' }], rowCount: 1 };
    }
    if (sql.includes('FROM po_lines')) {
      return { rows: [{ id: 'po-line-1', qty_ordered: 10, qty_received: 2 }], rowCount: 1 };
    }
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 3 }], rowCount: 1 };
    }
    if (sql.startsWith('INSERT')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
}

/**
 * db.query responses used by getGoodsReceiptById after creation/posting.
 */
function detailQueryResponses() {
  return (sql) => {
    if (sql.includes('FROM goods_receipts WHERE id')) {
      return {
        rows: [{
          id: 'gr-id', gr_number: 'GR-2026-0004', po_id: 'po-id', status: 'DRAFT',
          receipt_date: null, notes: null, created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      };
    }
    if (sql.includes('FROM gr_lines')) {
      return {
        rows: [{
          id: 'gr-line-1', line_no: 1, po_line_id: 'po-line-1', qty_received: 8,
          actual_site_code: 'WH-JKT', item_code: 'BRG-001', item_name: 'Safety Helmet', uom: 'PCS',
        }],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  };
}

// ─────────────────────────────────────────────────────────
// Payload Validation
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – payload validation', () => {
  test('rejects when body is null', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, null))
      .rejects.toMatchObject({ message: 'Body is required', statusCode: 422 });
  });

  test('rejects when poId is missing', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { lines: [{}] }))
      .rejects.toMatchObject({ message: 'poId is required', statusCode: 422 });
  });

  test('rejects when lines is empty array', async () => {
    const db = mockDb(null);
    await expect(createGoodsReceipt(db, { poId: 'po-id', lines: [] }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when poLineId is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ qtyReceived: 5, actualSiteCode: 'WH' }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].poLineId is required', statusCode: 422 });
  });

  test('rejects when actualSiteCode is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ poLineId: 'po-line-1', qtyReceived: 5 }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].actualSiteCode is required', statusCode: 422 });
  });

  test('rejects when qtyReceived is zero', async () => {
    const db = mockDb(null);
    const payload = validPayload({ lines: [{ poLineId: 'po-line-1', qtyReceived: 0, actualSiteCode: 'WH' }] });
    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].qtyReceived must be greater than 0', statusCode: 422 });
  });
});

// ─────────────────────────────────────────────────────────
// PO Status Guard
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – PO status guard', () => {
  test('rejects when PO is not found', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({ message: 'Purchase order not found', statusCode: 422 });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('rejects when PO status is not SUBMITTED', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) return { rows: [{ id: 'po-id', status: 'DRAFT' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({
        message: 'Goods receipt can only be created against a SUBMITTED purchase order',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// Over-receipt Guard
// ─────────────────────────────────────────────────────────

describe('createGoodsReceipt – over-receipt guard', () => {
  test('rejects when received qty exceeds PO line open qty', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) return { rows: [{ id: 'po-id', status: 'SUBMITTED' }], rowCount: 1 };
      if (sql.includes('FROM po_lines')) {
        return { rows: [{ id: 'po-line-1', qty_ordered: 10, qty_received: 8 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    const payload = validPayload({ lines: [{ poLineId: 'po-line-1', qtyReceived: 5, actualSiteCode: 'WH' }] });

    await expect(createGoodsReceipt(db, payload))
      .rejects.toMatchObject({
        message: 'lines[0]: received qty 5 exceeds open qty 2',
        statusCode: 422,
      });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('rejects when PO line does not exist', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders')) return { rows: [{ id: 'po-id', status: 'SUBMITTED' }], rowCount: 1 };
      if (sql.includes('FROM po_lines')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({ message: 'lines[0]: PO line not found', statusCode: 422 });
  });

  test('allows receipt when qty equals exact open qty', async () => {
    const client = mockClient(createHappyPathClientResponses());
    const db = mockDb(client, detailQueryResponses());

    const result = await createGoodsReceipt(db, validPayload({
      lines: [{ poLineId: 'po-line-1', qtyReceived: 8, actualSiteCode: 'WH-JKT' }],
    }));

    expect(result).toBeDefined();
    expect(result.status).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

// ─────────────────────────────────────────────────────────
// Post GR (status transition + qty roll-up)
// ─────────────────────────────────────────────────────────

describe('postGoodsReceipt', () => {
  test('returns null when GR does not exist', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    const result = await postGoodsReceipt(db, 'missing-id');
    expect(result).toBeNull();
  });

  test('rejects posting an already-posted GR', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts')) return { rows: [{ id: 'gr-id', status: 'POSTED' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(postGoodsReceipt(db, 'gr-id'))
      .rejects.toMatchObject({ message: 'Only DRAFT goods receipt can be posted', statusCode: 422 });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('successful post updates po_lines and pr_lines quantities', async () => {
    const updateCalls = [];
    const client = mockClient((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts WHERE id')) return { rows: [{ id: 'gr-id', status: 'DRAFT' }], rowCount: 1 };
      if (sql.includes('FROM gr_lines WHERE gr_id')) {
        return { rows: [{ po_line_id: 'po-line-1', qty_received: 6 }], rowCount: 1 };
      }
      if (sql.includes('SELECT id FROM po_lines WHERE id')) return { rows: [{ id: 'po-line-1' }], rowCount: 1 };
      if (sql.startsWith('UPDATE po_lines')) {
        updateCalls.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('FROM pr_line_allocations')) {
        return { rows: [{ pr_line_id: 'pr-line-1', allocated_qty: 6 }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE pr_lines')) {
        updateCalls.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE goods_receipts')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client, detailQueryResponses());

    const result = await postGoodsReceipt(db, 'gr-id');

    expect(result).toBeDefined();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(updateCalls.some((c) => c.sql.startsWith('UPDATE po_lines') && c.params[0] === 6)).toBe(true);
    expect(updateCalls.some((c) => c.sql.startsWith('UPDATE pr_lines') && c.params[0] === 6)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// Proportional Allocation Split
// ─────────────────────────────────────────────────────────

describe('distributeReceiptAcrossAllocations', () => {
  test('splits qty proportionally across two PR-line allocations', async () => {
    const updates = [];
    const client = {
      query: jest.fn((sql, params) => {
        if (sql.includes('FROM pr_line_allocations')) {
          return Promise.resolve({
            rows: [
              { pr_line_id: 'pr-line-a', allocated_qty: 3 },
              { pr_line_id: 'pr-line-b', allocated_qty: 7 },
            ],
            rowCount: 2,
          });
        }
        if (sql.startsWith('UPDATE pr_lines')) {
          updates.push(params);
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
    };

    await distributeReceiptAcrossAllocations(client, 'po-line-1', 10);

    // 3/10 * 10 = 3 for pr-line-a; remainder (7) goes to the last allocation (pr-line-b)
    expect(updates).toEqual([
      [3, 'pr-line-a'],
      [7, 'pr-line-b'],
    ]);
  });

  test('does nothing when PO line has no allocations', async () => {
    const client = {
      query: jest.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
    };

    await distributeReceiptAcrossAllocations(client, 'po-line-1', 10);

    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
