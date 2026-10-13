import { jest, describe, test, expect } from '@jest/globals';
import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
} from '../../src/services/goods-receipt-service.js';

const poId = 'po-1';
const poLineId = 'po-line-1';
const receiptId = 'gr-1';

function validPayload(overrides = {}) {
  return {
    poId,
    receiptDate: '2026-10-13',
    notes: 'Initial delivery',
    lines: [{ poLineId, qtyReceived: 3, actualSiteCode: 'WH-JKT' }],
    ...overrides,
  };
}

function receiptRows() {
  return [{
    id: receiptId,
    gr_number: 'GR-2026-0001',
    po_id: poId,
    po_number: 'PO-2026-0001',
    status: 'DRAFT',
    receipt_date: '2026-10-13',
    notes: 'Initial delivery',
    created_at: '2026-10-13T10:00:00.000Z',
    updated_at: '2026-10-13T10:00:00.000Z',
  }];
}

function receiptLineRows() {
  return [{
    id: 'gr-line-1',
    line_no: 1,
    po_line_id: poLineId,
    qty_received: '3.00',
    actual_site_code: 'WH-JKT',
    item_code: 'ITEM-1',
    item_name: 'Safety Helmet',
    site_code: 'WH-JKT',
    uom: 'PCS',
  }];
}

function createClient(queryOverride = () => null) {
  const query = jest.fn(async (sql, params) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK'
      || sql.startsWith('LOCK TABLE')) {
      return { rows: [], rowCount: 0 };
    }
    const overrideResult = queryOverride(sql, params);
    if (overrideResult) return overrideResult;
    if (sql.includes('FROM purchase_orders')) {
      return { rows: [{ id: poId, po_number: 'PO-2026-0001', status: 'SUBMITTED' }], rowCount: 1 };
    }
    if (sql.includes('FROM po_lines')) {
      return { rows: [{ id: poLineId, qty_ordered: '10.00', qty_received: '2.00' }], rowCount: 1 };
    }
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 0 }], rowCount: 1 };
    }
    return queryOverride(sql, params);
  });

  return { query, release: jest.fn() };
}

function createDb(client, queryOverride = () => ({ rows: [], rowCount: 0 })) {
  const query = jest.fn(async (sql) => {
    if (sql.includes('FROM goods_receipts gr')) {
      return { rows: receiptRows(), rowCount: 1 };
    }
    if (sql.includes('FROM gr_lines gl')) {
      return { rows: receiptLineRows(), rowCount: 1 };
    }
    return queryOverride(sql);
  });

  return { pool: { connect: jest.fn(async () => client) }, query };
}

describe('listGoodsReceipts', () => {
  test('returns receipt summaries and supports an empty list', async () => {
    const db = { query: jest.fn(async () => ({ rows: receiptRows(), rowCount: 1 })) };
    await expect(listGoodsReceipts(db)).resolves.toEqual([{
      id: receiptId,
      grNumber: 'GR-2026-0001',
      poId,
      poNumber: 'PO-2026-0001',
      status: 'DRAFT',
      receiptDate: '2026-10-13',
      notes: 'Initial delivery',
      createdAt: '2026-10-13T10:00:00.000Z',
      updatedAt: '2026-10-13T10:00:00.000Z',
    }]);

    await expect(listGoodsReceipts({ query: jest.fn(async () => ({ rows: [], rowCount: 0 })) }))
      .resolves.toEqual([]);
  });
});

describe('getGoodsReceiptById', () => {
  test('returns null when the receipt is missing', async () => {
    const db = { query: jest.fn(async () => ({ rows: [], rowCount: 0 })) };
    await expect(getGoodsReceiptById(db, 'missing')).resolves.toBeNull();
  });

  test('maps a receipt and its PO lines', async () => {
    const db = createDb(null);
    const result = await getGoodsReceiptById(db, receiptId);
    expect(result.grNumber).toBe('GR-2026-0001');
    expect(result.poNumber).toBe('PO-2026-0001');
    expect(result.lines).toEqual([{
      id: 'gr-line-1',
      lineNo: 1,
      poLineId,
      itemCode: 'ITEM-1',
      itemName: 'Safety Helmet',
      qtyReceived: 3,
      actualSiteCode: 'WH-JKT',
      siteCode: 'WH-JKT',
      uom: 'PCS',
    }]);
  });
});

describe('createGoodsReceipt', () => {
  test.each([
    [null, 'Body is required'],
    [{ poId, lines: [] }, 'lines must contain at least one item'],
    [validPayload({ lines: [{ poLineId, qtyReceived: 0, actualSiteCode: 'WH-JKT' }] }), 'lines[0].qtyReceived must be greater than 0'],
    [validPayload({ lines: [{ poLineId, qtyReceived: 1, actualSiteCode: '' }] }), 'lines[0].actualSiteCode is required'],
    [validPayload({ receiptDate: '2026-02-30' }), 'receiptDate must be a valid date in YYYY-MM-DD format'],
  ])('rejects invalid payloads before opening a transaction', async (payload, message) => {
    const client = createClient();
    const db = createDb(client);
    await expect(createGoodsReceipt(db, payload)).rejects.toMatchObject({ message, statusCode: 422 });
    expect(db.pool.connect).not.toHaveBeenCalled();
  });

  test('creates a draft receipt when its PO line has enough open quantity', async () => {
    const client = createClient();
    const db = createDb(client);
    const result = await createGoodsReceipt(db, validPayload());

    expect(result.status).toBe('DRAFT');
    expect(result.grNumber).toBe('GR-2026-0001');
    expect(result.lines[0].qtyReceived).toBe(3);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(client.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });

  test('rejects a missing or unsubmitted purchase order', async () => {
    for (const po of [null, { id: poId, status: 'DRAFT' }]) {
      const client = createClient((sql) => {
        if (sql.includes('FROM purchase_orders')) {
          return { rows: po ? [po] : [], rowCount: po ? 1 : 0 };
        }
        return { rows: [], rowCount: 0 };
      });
      const db = createDb(client);

      await expect(createGoodsReceipt(db, validPayload())).rejects.toMatchObject({
        message: po ? 'Only SUBMITTED purchase orders can receive goods' : 'Purchase order not found',
        statusCode: 422,
      });
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    }
  });

  test('rejects PO lines not belonging to the selected PO', async () => {
    const client = createClient((sql) => {
      if (sql.includes('FROM po_lines')) return { rows: [], rowCount: 0 };
      return null;
    });
    const db = createDb(client);

    await expect(createGoodsReceipt(db, validPayload()))
      .rejects.toMatchObject({ message: 'lines[0]: PO line not found on this purchase order', statusCode: 422 });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects quantities above open quantity, including duplicate lines', async () => {
    const client = createClient();
    const db = createDb(client);
    const payload = validPayload({ lines: [
      { poLineId, qtyReceived: 5, actualSiteCode: 'WH-JKT' },
      { poLineId, qtyReceived: 4, actualSiteCode: 'WH-JKT' },
    ] });

    await expect(createGoodsReceipt(db, payload)).rejects.toMatchObject({
      message: 'lines[0]: receipt qty 9 exceeds PO line open qty 8',
      statusCode: 422,
    });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

function createPostingDb({
  state = { poQtyOrdered: 10, poQtyReceived: 2, prQtyReceived: 0, receiptStatus: 'DRAFT' },
  id = 'gr-1',
  receiptQty = 3,
  receiptExists = true,
  poStatus = 'SUBMITTED',
  failPrUpdate = false,
} = {}) {
  let transactionSnapshot;
  const client = {
    query: jest.fn(async (sql, params = []) => {
      if (sql === 'BEGIN') {
        transactionSnapshot = { ...state };
        return { rows: [], rowCount: 0 };
      }
      if (sql === 'ROLLBACK') {
        Object.assign(state, transactionSnapshot);
        return { rows: [], rowCount: 0 };
      }
      if (sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM goods_receipts gr')) {
        return receiptExists
          ? { rows: [{ id, po_id: poId, status: state.receiptStatus, po_status: poStatus }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (sql.includes('FROM gr_lines')) {
        return { rows: [{ po_line_id: poLineId, qty_received: receiptQty }], rowCount: 1 };
      }
      if (sql.includes('FROM po_lines')) {
        return {
          rows: [{ id: poLineId, qty_ordered: state.poQtyOrdered, qty_received: state.poQtyReceived }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM pr_line_allocations')) {
        return { rows: [{ pr_line_id: 'pr-line-1' }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE po_lines')) {
        state.poQtyReceived += Number(params[0]);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE pr_lines')) {
        if (failPrUpdate) throw new Error('PR counter update failed');
        state.prQtyReceived += Number(params[0]);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE goods_receipts')) {
        state.receiptStatus = 'POSTED';
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };

  const db = {
    pool: { connect: jest.fn(async () => client) },
    query: jest.fn(async (sql) => {
      if (sql.includes('FROM goods_receipts gr')) {
        return {
          rows: [{
            id,
            gr_number: `GR-${id}`,
            po_id: poId,
            po_number: 'PO-2026-0001',
            status: state.receiptStatus,
            receipt_date: '2026-10-13',
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM gr_lines gl')) {
        return {
          rows: [{
            id: `line-${id}`,
            line_no: 1,
            po_line_id: poLineId,
            qty_received: receiptQty,
            actual_site_code: 'WH-JKT',
            item_code: 'ITEM-1',
            item_name: 'Safety Helmet',
            site_code: 'WH-JKT',
            uom: 'PCS',
          }],
          rowCount: 1,
        };
      }
      throw new Error(`Unexpected db query: ${sql}`);
    }),
  };

  return { db, client, state };
}

describe('postGoodsReceipt', () => {
  test('posts a receipt and increments PO and linked PR quantities', async () => {
    const { db, client, state } = createPostingDb();
    const result = await postGoodsReceipt(db, 'gr-1');

    expect(result.status).toBe('POSTED');
    expect(state.poQtyReceived).toBe(5);
    expect(state.prQtyReceived).toBe(3);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('supports partial receipts and cumulative tracking up to the ordered quantity', async () => {
    const state = { poQtyOrdered: 10, poQtyReceived: 0, prQtyReceived: 0, receiptStatus: 'DRAFT' };
    const first = createPostingDb({ state, id: 'gr-1', receiptQty: 4 });
    const second = createPostingDb({ state, id: 'gr-2', receiptQty: 6 });

    await postGoodsReceipt(first.db, 'gr-1');
    expect(state.poQtyReceived).toBe(4);
    expect(state.prQtyReceived).toBe(4);

    state.receiptStatus = 'DRAFT';
    await postGoodsReceipt(second.db, 'gr-2');
    expect(state.poQtyReceived).toBe(10);
    expect(state.prQtyReceived).toBe(10);
  });

  test('returns null for a missing receipt and rejects an already-posted receipt', async () => {
    const missing = createPostingDb({ receiptExists: false });
    await expect(postGoodsReceipt(missing.db, 'missing')).resolves.toBeNull();

    const posted = createPostingDb({ state: {
      poQtyOrdered: 10, poQtyReceived: 2, prQtyReceived: 0, receiptStatus: 'POSTED',
    } });
    await expect(postGoodsReceipt(posted.db, 'gr-1'))
      .rejects.toMatchObject({ message: 'Only DRAFT goods receipts can be posted', statusCode: 422 });
    expect(posted.client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects stale drafts without changing any counters', async () => {
    const { db, client, state } = createPostingDb({
      state: { poQtyOrdered: 10, poQtyReceived: 8, prQtyReceived: 8, receiptStatus: 'DRAFT' },
      receiptQty: 3,
    });

    await expect(postGoodsReceipt(db, 'gr-1')).rejects.toMatchObject({
      message: 'Receipt qty 3 exceeds PO line open qty 2',
      statusCode: 422,
    });
    expect(state.poQtyReceived).toBe(8);
    expect(state.prQtyReceived).toBe(8);
    expect(state.receiptStatus).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rolls back PO updates if linked PR update fails', async () => {
    const { db, client, state } = createPostingDb({ failPrUpdate: true });

    await expect(postGoodsReceipt(db, 'gr-1')).rejects.toThrow('PR counter update failed');
    expect(state.poQtyReceived).toBe(2);
    expect(state.prQtyReceived).toBe(0);
    expect(state.receiptStatus).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});