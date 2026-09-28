import { describe, test, expect, jest } from '@jest/globals';
import {
  listRequisitions,
  getRequisitionOpenLines,
} from '../../src/services/requisition-service.js';

function mockDb(queryImpl) {
  return { query: jest.fn(queryImpl) };
}

describe('requisition-service list functions', () => {
  test('listRequisitions returns mapped header fields', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-1',
          pr_number: 'PR-2026-0001',
          status: 'APPROVED',
          requester_name: 'Rina',
          department_name: 'Ops',
          title: 'Spare parts',
          needed_by_date: '2026-06-15',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        status: 'APPROVED',
        requesterName: 'Rina',
        departmentName: 'Ops',
        title: 'Spare parts',
        notes: undefined,
        neededByDate: '2026-06-15',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
    ]);
  });

  test('getRequisitionOpenLines returns null when requisition not found', async () => {
    const db = mockDb(() => ({ rows: [], rowCount: 0 }));

    const result = await getRequisitionOpenLines(db, 'missing-id');

    expect(result).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('getRequisitionOpenLines filters only qtyOpenForPo greater than 0', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'A',
            item_name: 'Item A',
            qty_requested: 10,
            qty_allocated: 7,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 1000,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
          {
            id: 'l-2',
            line_no: 2,
            item_code: 'B',
            item_name: 'Item B',
            qty_requested: 5,
            qty_allocated: 5,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 2000,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
        ],
        rowCount: 2,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    expect(result.requisition).toEqual({
      id: 'pr-1',
      prNumber: 'PR-2026-0001',
      status: 'APPROVED',
    });
    expect(result.openLines).toHaveLength(1);
    expect(result.openLines[0].id).toBe('l-1');
    expect(result.openLines[0].qtyOpenForPo).toBe(3);
  });

  test('listRequisitions returns empty array when no requisitions exist', async () => {
    const db = mockDb(() => ({ rows: [], rowCount: 0 }));

    const result = await listRequisitions(db);

    expect(result).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('listRequisitions returns multiple requisitions in correct order', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-2',
          pr_number: 'PR-2026-0002',
          status: 'PENDING',
          requester_name: 'Budi Santoso',
          department_name: 'Engineering',
          title: 'Computer Parts',
          needed_by_date: '2026-07-01',
          created_at: '2026-05-02T10:00:00.000Z',
          updated_at: '2026-05-02T10:00:00.000Z',
        },
        {
          id: 'pr-1',
          pr_number: 'PR-2026-0001',
          status: 'APPROVED',
          requester_name: 'Rina Pratama',
          department_name: 'Operations',
          title: 'Office Supplies',
          needed_by_date: '2026-06-15',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(result).toHaveLength(2);
    expect(result[0].prNumber).toBe('PR-2026-0002');
    expect(result[1].prNumber).toBe('PR-2026-0001');
  });

  test('listRequisitions maps all header fields correctly', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-123',
          pr_number: 'PR-2026-0005',
          status: 'APPROVED',
          requester_name: 'John Doe',
          department_name: 'Finance',
          title: 'Budget Planning',
          needed_by_date: '2026-06-30',
          created_at: '2026-05-15T14:30:00.000Z',
          updated_at: '2026-05-16T09:15:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(result[0]).toEqual({
      id: 'pr-123',
      prNumber: 'PR-2026-0005',
      status: 'APPROVED',
      requesterName: 'John Doe',
      departmentName: 'Finance',
      title: 'Budget Planning',
      notes: undefined,
      neededByDate: '2026-06-30',
      createdAt: '2026-05-15T14:30:00.000Z',
      updatedAt: '2026-05-16T09:15:00.000Z',
    });
  });

  test('listRequisitions handles requisitions without notes field', async () => {
    const db = mockDb(() => ({
      rows: [
        {
          id: 'pr-1',
          pr_number: 'PR-2026-0001',
          status: 'APPROVED',
          requester_name: 'Rina',
          department_name: 'Ops',
          title: 'Supplies',
          notes: null,
          needed_by_date: '2026-06-15',
          created_at: '2026-05-01T10:00:00.000Z',
          updated_at: '2026-05-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await listRequisitions(db);

    expect(result[0].notes).toBeNull();
  });

  test('getRequisitionOpenLines maps all line fields correctly', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'SKU-001',
            item_name: 'Safety Helmet',
            qty_requested: 50,
            qty_allocated: 30,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 150000,
            site_code: 'WH-JKT',
            required_date: '2026-06-15',
            budget_center: 'DEPT-001',
          },
        ],
        rowCount: 1,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    expect(result.openLines[0]).toEqual({
      id: 'l-1',
      lineNo: 1,
      itemCode: 'SKU-001',
      itemName: 'Safety Helmet',
      qtyRequested: 50,
      qtyAllocated: 30,
      qtyReceived: 0,
      qtyOpenForPo: 20,
      uom: 'PCS',
      estUnitPrice: 150000,
      siteCode: 'WH-JKT',
      requiredDate: '2026-06-15',
      budgetCenter: 'DEPT-001',
    });
  });

  test('getRequisitionOpenLines handles multiple lines with mixed allocation states', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'A',
            item_name: 'Item A',
            qty_requested: 100,
            qty_allocated: 30,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 100,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
          {
            id: 'l-2',
            line_no: 2,
            item_code: 'B',
            item_name: 'Item B',
            qty_requested: 20,
            qty_allocated: 20,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 200,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
          {
            id: 'l-3',
            line_no: 3,
            item_code: 'C',
            item_name: 'Item C',
            qty_requested: 50,
            qty_allocated: 0,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 300,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
        ],
        rowCount: 3,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    // Should return lines 1 and 3 (qty > 0), skip line 2 (fully allocated)
    expect(result.openLines).toHaveLength(2);
    expect(result.openLines[0].qtyOpenForPo).toBe(70); // 100 - 30
    expect(result.openLines[1].qtyOpenForPo).toBe(50); // 50 - 0
  });

  test('getRequisitionOpenLines correctly handles zero qty allocated', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'A',
            item_name: 'Item A',
            qty_requested: 100,
            qty_allocated: 0,
            qty_received: 0,
            uom: 'PCS',
            est_unit_price: 100,
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
        ],
        rowCount: 1,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    expect(result.openLines).toHaveLength(1);
    expect(result.openLines[0].qtyOpenForPo).toBe(100);
  });

  test('getRequisitionOpenLines converts quantity fields to numbers', async () => {
    let call = 0;
    const db = mockDb(() => {
      call += 1;
      if (call === 1) {
        return {
          rows: [{ id: 'pr-1', status: 'APPROVED', pr_number: 'PR-2026-0001' }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          {
            id: 'l-1',
            line_no: 1,
            item_code: 'A',
            item_name: 'Item A',
            qty_requested: '50', // String from DB
            qty_allocated: '20', // String from DB
            qty_received: '0',
            uom: 'PCS',
            est_unit_price: '150.50',
            site_code: 'JKT',
            required_date: null,
            budget_center: null,
          },
        ],
        rowCount: 1,
      };
    });

    const result = await getRequisitionOpenLines(db, 'pr-1');

    const line = result.openLines[0];
    expect(typeof line.qtyRequested).toBe('number');
    expect(typeof line.qtyAllocated).toBe('number');
    expect(typeof line.qtyReceived).toBe('number');
    expect(typeof line.estUnitPrice).toBe('number');
    expect(line.qtyRequested).toBe(50);
    expect(line.qtyAllocated).toBe(20);
    expect(line.qtyOpenForPo).toBe(30);
    expect(line.estUnitPrice).toBe(150.5);
  });
});