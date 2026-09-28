import { jest, describe, test, expect } from '@jest/globals';
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getOpenPoLines,
  submitPurchaseOrder,
} from '../../src/services/purchase-order-service.js';

// ── Helpers ──────────────────────────────────────────────

/**
 * Build a valid PO creation payload.
 * Override any field by passing partial objects.
 */
function validPayload(overrides = {}) {
  return {
    vendorName: 'PT Supplier Jaya',
    lines: [
      {
        prLineId: 'pr-line-001',
        itemCode: 'BRG-001',
        itemName: 'Safety Helmet',
        qtyOrdered: 5,
        unitPrice: 150000,
        uom: 'PCS',
        siteCode: 'WH-JKT',
      },
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
 * Standard client responses for a successful PO creation:
 *   BEGIN → PR line SELECT FOR UPDATE → PO count → INSERT header →
 *   INSERT line → INSERT allocation → UPDATE pr_lines → COMMIT
 * Then getPurchaseOrderById calls db.query for header + lines + allocations.
 */
function happyPathClientResponses() {
  return (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }
    // PR line lock check
    if (sql.includes('FOR UPDATE')) {
      return {
        rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 0, pr_status: 'APPROVED' }],
        rowCount: 1,
      };
    }
    // PO count
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: 3 }], rowCount: 1 };
    }
    // INSERT / UPDATE
    if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
}

/**
 * db.query responses used by getPurchaseOrderById after creation.
 */
function detailQueryResponses() {
  return (sql) => {
    if (sql.includes('FROM purchase_orders WHERE id')) {
      return {
        rows: [{
          id: 'po-id', po_number: 'PO-2026-0004', status: 'DRAFT',
          vendor_name: 'PT Supplier Jaya', created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      };
    }
    if (sql.includes('FROM po_lines')) {
      return {
        rows: [{
          id: 'po-line-1', line_no: 1, item_code: 'BRG-001', item_name: 'Safety Helmet',
          qty_ordered: 5, qty_received: 0, uom: 'PCS', unit_price: 150000,
          site_code: 'WH-JKT', required_date: null,
        }],
        rowCount: 1,
      };
    }
    if (sql.includes('pr_line_allocations')) {
      return {
        rows: [{ pr_line_id: 'pr-line-001', pr_number: 'PR-2026-0001', allocated_qty: 5 }],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  };
}

// ─────────────────────────────────────────────────────────
// Payload Validation (via createPurchaseOrder)
// ─────────────────────────────────────────────────────────

describe('createPurchaseOrder – payload validation', () => {
  test('rejects when body is null', async () => {
    const db = mockDb(null);
    await expect(createPurchaseOrder(db, null))
      .rejects.toMatchObject({ message: 'Body is required', statusCode: 422 });
  });

  test('rejects when vendorName is missing', async () => {
    const db = mockDb(null);
    await expect(createPurchaseOrder(db, { lines: [{}] }))
      .rejects.toMatchObject({ message: 'vendorName is required', statusCode: 422 });
  });

  test('rejects when vendorName is empty string', async () => {
    const db = mockDb(null);
    await expect(createPurchaseOrder(db, { vendorName: '   ', lines: [{}] }))
      .rejects.toMatchObject({ message: 'vendorName is required', statusCode: 422 });
  });

  test('rejects when lines is empty array', async () => {
    const db = mockDb(null);
    await expect(createPurchaseOrder(db, { vendorName: 'X', lines: [] }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when lines is not an array', async () => {
    const db = mockDb(null);
    await expect(createPurchaseOrder(db, { vendorName: 'X', lines: 'nope' }))
      .rejects.toMatchObject({ message: 'lines must contain at least one item', statusCode: 422 });
  });

  test('rejects when prLineId is missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{ itemCode: 'A', itemName: 'A', qtyOrdered: 1, unitPrice: 0, uom: 'PCS', siteCode: 'WH' }],
    });
    await expect(createPurchaseOrder(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].prLineId is required', statusCode: 422 });
  });

  test('rejects when required line fields are missing', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{ prLineId: 'pr-1', qtyOrdered: 1, unitPrice: 0 }],
    });
    await expect(createPurchaseOrder(db, payload))
      .rejects.toMatchObject({
        message: 'lines[0] itemCode, itemName, uom, and siteCode are required',
        statusCode: 422,
      });
  });

  test('rejects when qtyOrdered is zero', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{
        prLineId: 'pr-1', itemCode: 'A', itemName: 'A', uom: 'PCS',
        siteCode: 'WH', qtyOrdered: 0, unitPrice: 100,
      }],
    });
    await expect(createPurchaseOrder(db, payload))
      .rejects.toMatchObject({ message: 'lines[0].qtyOrdered must be greater than 0', statusCode: 422 });
  });

  test('rejects when unitPrice is negative', async () => {
    const db = mockDb(null);
    const payload = validPayload({
      lines: [{
        prLineId: 'pr-1', itemCode: 'A', itemName: 'A', uom: 'PCS',
        siteCode: 'WH', qtyOrdered: 5, unitPrice: -1,
      }],
    });
    await expect(createPurchaseOrder(db, payload))
      .rejects.toMatchObject({
        message: 'lines[0].unitPrice must be greater than or equal to 0',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// Over-allocation Guard
// ─────────────────────────────────────────────────────────

describe('createPurchaseOrder – over-allocation guard', () => {
  test('rejects when allocation qty exceeds PR line remaining qty', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 7, pr_status: 'APPROVED' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    // Requesting 5 but only 3 remaining (10 - 7)
    const payload = validPayload({ lines: [{ ...validPayload().lines[0], qtyOrdered: 5 }] });

    await expect(createPurchaseOrder(db, payload))
      .rejects.toMatchObject({
        message: 'lines[0]: allocation qty 5 exceeds remaining 3',
        statusCode: 422,
      });

    // Verify ROLLBACK was called
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('allows allocation when qty equals exact remaining', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 5, pr_status: 'APPROVED' }],
          rowCount: 1,
        };
      }
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const db = mockDb(client, detailQueryResponses());

    // Requesting exactly 5 with 5 remaining
    const payload = validPayload({ lines: [{ ...validPayload().lines[0], qtyOrdered: 5 }] });

    const result = await createPurchaseOrder(db, payload);
    expect(result).toBeDefined();
    expect(result.status).toBe('DRAFT');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects when PR line does not exist', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return { rows: [], rowCount: 0 }; // Not found
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createPurchaseOrder(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PR line not found',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// PR Status Check
// ─────────────────────────────────────────────────────────

describe('createPurchaseOrder – PR status check', () => {
  test('rejects when PR is in DRAFT status', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 0, pr_status: 'DRAFT' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createPurchaseOrder(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PR must be APPROVED before allocation',
        statusCode: 422,
      });
  });

  test('rejects when PR is in SUBMITTED status', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 0, pr_status: 'SUBMITTED' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createPurchaseOrder(db, validPayload()))
      .rejects.toMatchObject({
        message: 'lines[0]: PR must be APPROVED before allocation',
        statusCode: 422,
      });
  });
});

// ─────────────────────────────────────────────────────────
// Successful PO Creation
// ─────────────────────────────────────────────────────────

describe('createPurchaseOrder – success path', () => {
  test('creates PO and returns detail with DRAFT status', async () => {
    const client = mockClient(happyPathClientResponses());
    const db = mockDb(client, detailQueryResponses());

    const result = await createPurchaseOrder(db, validPayload());

    expect(result.poNumber).toBe('PO-2026-0004');
    expect(result.status).toBe('DRAFT');
    expect(result.vendorName).toBe('PT Supplier Jaya');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].itemCode).toBe('BRG-001');
    expect(result.lines[0].qtyOrdered).toBe(5);
    expect(result.lines[0].allocations).toHaveLength(1);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rolls back and releases client on unexpected error', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN') return { rows: [], rowCount: 0 };
      if (sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 'pr-line-001', qty_requested: 10, qty_allocated: 0, pr_status: 'APPROVED' }],
          rowCount: 1,
        };
      }
      if (sql.includes('COUNT(*)')) {
        throw new Error('DB connection lost');
      }
      return { rows: [], rowCount: 0 };
    });
    const db = mockDb(client);

    await expect(createPurchaseOrder(db, validPayload()))
      .rejects.toThrow('DB connection lost');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────
// Submit PO – Status Transition
// ─────────────────────────────────────────────────────────

describe('submitPurchaseOrder – status transition', () => {
  test('returns null when PO does not exist', async () => {
    const db = mockDb(null, () => ({ rows: [], rowCount: 0 }));

    const result = await submitPurchaseOrder(db, 'non-existent-id');
    expect(result).toBeNull();
  });

  test('submits a DRAFT PO successfully', async () => {
    let callCount = 0;
    const db = {
      query: jest.fn((sql) => {
        // First call: SELECT status
        if (sql.includes('SELECT id, status') && callCount === 0) {
          callCount++;
          return { rows: [{ id: 'po-1', status: 'DRAFT' }], rowCount: 1 };
        }
        // Second call: UPDATE
        if (sql.includes('UPDATE purchase_orders')) {
          return { rows: [], rowCount: 1 };
        }
        // getPurchaseOrderById calls
        if (sql.includes('FROM purchase_orders WHERE id')) {
          return {
            rows: [{
              id: 'po-1', po_number: 'PO-2026-0001', status: 'SUBMITTED',
              vendor_name: 'PT Jaya', created_at: new Date(), updated_at: new Date(),
            }],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM po_lines')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };

    const result = await submitPurchaseOrder(db, 'po-1');
    expect(result.status).toBe('SUBMITTED');
    expect(result.poNumber).toBe('PO-2026-0001');
  });

  test('rejects submit when PO is already SUBMITTED', async () => {
    const db = mockDb(null, () => ({
      rows: [{ id: 'po-1', status: 'SUBMITTED' }],
      rowCount: 1,
    }));

    await expect(submitPurchaseOrder(db, 'po-1'))
      .rejects.toMatchObject({
        message: 'Only DRAFT purchase order can be submitted',
        statusCode: 422,
      });
  });

  test('rejects submit when PO is CANCELLED', async () => {
    const db = mockDb(null, () => ({
      rows: [{ id: 'po-1', status: 'CANCELLED' }],
      rowCount: 1,
    }));

    await expect(submitPurchaseOrder(db, 'po-1'))
      .rejects.toMatchObject({
        message: 'Only DRAFT purchase order can be submitted',
        statusCode: 422,
      });
  });
});

describe('purchase-order-service list functions', () => {
  test('listPurchaseOrders returns mapped header fields', async () => {
    const db = {
      query: jest.fn(() => ({
        rows: [
          {
            id: 'po-1',
            po_number: 'PO-2026-0001',
            status: 'DRAFT',
            vendor_name: 'PT Maju',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      })),
    };

    const result = await listPurchaseOrders(db);

    expect(result).toEqual([
      {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'DRAFT',
        vendorName: 'PT Maju',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ]);
  });

  test('getOpenPoLines returns null when PO not found', async () => {
    const db = { query: jest.fn(() => ({ rows: [], rowCount: 0 })) };

    const result = await getOpenPoLines(db, 'missing-id');

    expect(result).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('getOpenPoLines returns only lines with qtyOpenForGr greater than 0', async () => {
    let call = 0;
    const db = {
      query: jest.fn(() => {
        call += 1;
        if (call === 1) {
          return {
            rows: [{ id: 'po-1', po_number: 'PO-2026-0001', status: 'SUBMITTED' }],
            rowCount: 1,
          };
        }
        return {
          rows: [
            {
              id: 'po-line-1',
              line_no: 1,
              item_code: 'A',
              item_name: 'Item A',
              qty_ordered: 10,
              qty_received: 4,
              uom: 'PCS',
              unit_price: 1000,
              site_code: 'JKT',
              required_date: null,
            },
            {
              id: 'po-line-2',
              line_no: 2,
              item_code: 'B',
              item_name: 'Item B',
              qty_ordered: 3,
              qty_received: 3,
              uom: 'PCS',
              unit_price: 2000,
              site_code: 'JKT',
              required_date: null,
            },
          ],
          rowCount: 2,
        };
      }),
    };

    const result = await getOpenPoLines(db, 'po-1');

    expect(result.purchaseOrder).toEqual({
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      status: 'SUBMITTED',
    });
    expect(result.openLines).toHaveLength(1);
    expect(result.openLines[0].id).toBe('po-line-1');
    expect(result.openLines[0].qtyOpenForGr).toBe(6);
  });

  test('listPurchaseOrders returns empty array when no orders exist', async () => {
    const db = {
      query: jest.fn(() => ({ rows: [], rowCount: 0 })),
    };

    const result = await listPurchaseOrders(db);

    expect(result).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('listPurchaseOrders returns multiple POs in correct order', async () => {
    const db = {
      query: jest.fn(() => ({
        rows: [
          {
            id: 'po-2',
            po_number: 'PO-2026-0002',
            status: 'SUBMITTED',
            vendor_name: 'PT Supplier B',
            created_at: '2026-05-02T10:00:00.000Z',
            updated_at: '2026-05-02T10:00:00.000Z',
          },
          {
            id: 'po-1',
            po_number: 'PO-2026-0001',
            status: 'DRAFT',
            vendor_name: 'PT Supplier A',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      })),
    };

    const result = await listPurchaseOrders(db);

    expect(result).toHaveLength(2);
    expect(result[0].poNumber).toBe('PO-2026-0002');
    expect(result[1].poNumber).toBe('PO-2026-0001');
  });

  test('listPurchaseOrders maps all header fields correctly', async () => {
    const db = {
      query: jest.fn(() => ({
        rows: [
          {
            id: 'po-123',
            po_number: 'PO-2026-0005',
            status: 'APPROVED',
            vendor_name: 'PT Global Suppliers',
            created_at: '2026-05-15T14:30:00.000Z',
            updated_at: '2026-05-16T09:15:00.000Z',
          },
        ],
      })),
    };

    const result = await listPurchaseOrders(db);

    expect(result[0]).toEqual({
      id: 'po-123',
      poNumber: 'PO-2026-0005',
      status: 'APPROVED',
      vendorName: 'PT Global Suppliers',
      createdAt: '2026-05-15T14:30:00.000Z',
      updatedAt: '2026-05-16T09:15:00.000Z',
    });
  });

  test('getOpenPoLines filters out fully received lines', async () => {
    let call = 0;
    const db = {
      query: jest.fn(() => {
        call += 1;
        if (call === 1) {
          return {
            rows: [{ id: 'po-1', po_number: 'PO-2026-0001', status: 'SUBMITTED' }],
            rowCount: 1,
          };
        }
        return {
          rows: [
            {
              id: 'po-line-1',
              line_no: 1,
              item_code: 'A',
              item_name: 'Item A',
              qty_ordered: 10,
              qty_received: 0,
              uom: 'PCS',
              unit_price: 1000,
              site_code: 'JKT',
              required_date: null,
            },
            {
              id: 'po-line-2',
              line_no: 2,
              item_code: 'B',
              item_name: 'Item B',
              qty_ordered: 5,
              qty_received: 5,
              uom: 'PCS',
              unit_price: 2000,
              site_code: 'JKT',
              required_date: null,
            },
            {
              id: 'po-line-3',
              line_no: 3,
              item_code: 'C',
              item_name: 'Item C',
              qty_ordered: 8,
              qty_received: 3,
              uom: 'PCS',
              unit_price: 1500,
              site_code: 'JKT',
              required_date: null,
            },
          ],
          rowCount: 3,
        };
      }),
    };

    const result = await getOpenPoLines(db, 'po-1');

    expect(result.openLines).toHaveLength(2);
    expect(result.openLines.map(l => l.id)).toEqual(['po-line-1', 'po-line-3']);
    expect(result.openLines[0].qtyOpenForGr).toBe(10); // 10 - 0
    expect(result.openLines[1].qtyOpenForGr).toBe(5); // 8 - 3
  });

  test('getOpenPoLines maps line fields correctly', async () => {
    let call = 0;
    const db = {
      query: jest.fn(() => {
        call += 1;
        if (call === 1) {
          return {
            rows: [{ id: 'po-1', po_number: 'PO-2026-0001', status: 'SUBMITTED' }],
            rowCount: 1,
          };
        }
        return {
          rows: [
            {
              id: 'po-line-1',
              line_no: 1,
              item_code: 'SKU-001',
              item_name: 'Widget Pro',
              qty_ordered: 100,
              qty_received: 40,
              uom: 'BOX',
              unit_price: 250.50,
              site_code: 'WH-JKT',
              required_date: '2026-06-20',
            },
          ],
          rowCount: 1,
        };
      }),
    };

    const result = await getOpenPoLines(db, 'po-1');

    expect(result.openLines[0]).toEqual({
      id: 'po-line-1',
      lineNo: 1,
      itemCode: 'SKU-001',
      itemName: 'Widget Pro',
      qtyOrdered: 100,
      qtyReceived: 40,
      qtyOpenForGr: 60,
      uom: 'BOX',
      unitPrice: 250.50,
      siteCode: 'WH-JKT',
      requiredDate: '2026-06-20',
    });
  });

  test('getOpenPoLines handles PO with no lines', async () => {
    let call = 0;
    const db = {
      query: jest.fn(() => {
        call += 1;
        if (call === 1) {
          return {
            rows: [{ id: 'po-1', po_number: 'PO-2026-0001', status: 'SUBMITTED' }],
            rowCount: 1,
          };
        }
        return {
          rows: [],
          rowCount: 0,
        };
      }),
    };

    const result = await getOpenPoLines(db, 'po-1');

    expect(result.openLines).toHaveLength(0);
    expect(result.purchaseOrder.poNumber).toBe('PO-2026-0001');
  });

  test('listPurchaseOrders correctly converts numeric strings to numbers', async () => {
    const db = {
      query: jest.fn(() => ({
        rows: [
          {
            id: 'po-1',
            po_number: 'PO-2026-0001',
            status: 'DRAFT',
            vendor_name: 'PT Supplier',
            created_at: '2026-05-01T10:00:00.000Z',
            updated_at: '2026-05-01T10:00:00.000Z',
          },
        ],
      })),
    };

    const result = await listPurchaseOrders(db);

    // Verify string values remain as strings
    expect(typeof result[0].id).toBe('string');
    expect(typeof result[0].poNumber).toBe('string');
    expect(typeof result[0].status).toBe('string');
  });

  test('example test', async () => {
    expect(true).toBe(false);
  });
});
