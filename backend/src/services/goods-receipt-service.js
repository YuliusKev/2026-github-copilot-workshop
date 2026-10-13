import { v4 as uuidv4 } from 'uuid';

function createError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function mapReceipt(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    poNumber: row.po_number,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    lineNo: row.line_no,
    poLineId: row.po_line_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyReceived: Number(row.qty_received),
    actualSiteCode: row.actual_site_code,
    siteCode: row.site_code,
    uom: row.uom,
  };
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Body is required';
  }

  if (typeof payload.poId !== 'string' || !payload.poId.trim()) {
    return 'poId is required';
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  if (payload.receiptDate != null && !isValidDate(payload.receiptDate)) {
    return 'receiptDate must be a valid date in YYYY-MM-DD format';
  }

  if (payload.notes != null && typeof payload.notes !== 'string') {
    return 'notes must be a string';
  }

  for (let index = 0; index < payload.lines.length; index++) {
    const line = payload.lines[index];
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      return `lines[${index}] must be an object`;
    }

    if (typeof line.poLineId !== 'string' || !line.poLineId.trim()) {
      return `lines[${index}].poLineId is required`;
    }

    if (!Number.isFinite(Number(line.qtyReceived)) || Number(line.qtyReceived) <= 0) {
      return `lines[${index}].qtyReceived must be greater than 0`;
    }

    if (typeof line.actualSiteCode !== 'string' || !line.actualSiteCode.trim()) {
      return `lines[${index}].actualSiteCode is required`;
    }
  }

  return null;
}

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, po.po_number, gr.status,
            gr.receipt_date, gr.notes, gr.created_at, gr.updated_at
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );

  return rows.map(mapReceipt);
}

export async function getGoodsReceiptById(db, id) {
  const receiptResult = await db.query(
    `SELECT gr.id, gr.gr_number, gr.po_id, po.po_number, gr.status,
            gr.receipt_date, gr.notes, gr.created_at, gr.updated_at
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );

  if (receiptResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT gl.id, gl.line_no, gl.po_line_id, gl.qty_received,
            gl.actual_site_code, pol.item_code, pol.item_name, pol.site_code, pol.uom
     FROM gr_lines gl
     JOIN po_lines pol ON pol.id = gl.po_line_id
     WHERE gl.gr_id = $1
     ORDER BY gl.line_no ASC`,
    [id]
  );

  return {
    ...mapReceipt(receiptResult.rows[0]),
    lines: linesResult.rows.map(mapLine),
  };
}

export async function createGoodsReceipt(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    throw createError(validationError);
  }

  const client = await db.pool.connect();
  const receiptId = uuidv4();

  try {
    await client.query('BEGIN');

    const purchaseOrderResult = await client.query(
      `SELECT id, po_number, status
       FROM purchase_orders
       WHERE id = $1
       FOR UPDATE`,
      [payload.poId]
    );

    if (purchaseOrderResult.rowCount === 0) {
      throw createError('Purchase order not found');
    }

    if (purchaseOrderResult.rows[0].status !== 'SUBMITTED') {
      throw createError('Only SUBMITTED purchase orders can receive goods');
    }

    const poLineIds = [...new Set(payload.lines.map((line) => line.poLineId))].sort();
    const poLinesResult = await client.query(
      `SELECT id, qty_ordered, qty_received
       FROM po_lines
       WHERE po_id = $1 AND id = ANY($2::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [payload.poId, poLineIds]
    );
    const poLinesById = new Map(poLinesResult.rows.map((line) => [line.id, line]));
    const requestedByPoLine = new Map();

    for (let index = 0; index < payload.lines.length; index++) {
      const line = payload.lines[index];
      const poLine = poLinesById.get(line.poLineId);
      if (!poLine) {
        throw createError(`lines[${index}]: PO line not found on this purchase order`);
      }

      const request = requestedByPoLine.get(line.poLineId) || { qty: 0, firstIndex: index };
      request.qty += Number(line.qtyReceived);
      requestedByPoLine.set(line.poLineId, request);
    }

    for (const [poLineId, request] of requestedByPoLine) {
      const poLine = poLinesById.get(poLineId);
      const openQty = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (request.qty > openQty) {
        throw createError(
          `lines[${request.firstIndex}]: receipt qty ${request.qty} exceeds PO line open qty ${openQty}`
        );
      }
    }

    await client.query('LOCK TABLE goods_receipts IN EXCLUSIVE MODE');
    const countResult = await client.query(
      'SELECT COUNT(*)::int AS total FROM goods_receipts'
    );
    const grNumber = `GR-2026-${String(Number(countResult.rows[0].total) + 1).padStart(4, '0')}`;

    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [receiptId, grNumber, payload.poId, payload.receiptDate || null, payload.notes?.trim() || null]
    );

    for (let index = 0; index < payload.lines.length; index++) {
      const line = payload.lines[index];
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), receiptId, line.poLineId, index + 1, Number(line.qtyReceived), line.actualSiteCode.trim()]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getGoodsReceiptById(db, receiptId);
}

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const receiptResult = await client.query(
      `SELECT gr.id, gr.po_id, gr.status, po.status AS po_status
       FROM goods_receipts gr
       JOIN purchase_orders po ON po.id = gr.po_id
       WHERE gr.id = $1
       FOR UPDATE OF gr, po`,
      [id]
    );

    if (receiptResult.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const receipt = receiptResult.rows[0];
    if (receipt.status !== 'DRAFT') {
      throw createError('Only DRAFT goods receipts can be posted');
    }
    if (receipt.po_status !== 'SUBMITTED') {
      throw createError('Only receipts for SUBMITTED purchase orders can be posted');
    }

    const receiptLinesResult = await client.query(
      `SELECT po_line_id, qty_received
       FROM gr_lines
       WHERE gr_id = $1
       ORDER BY po_line_id, line_no`,
      [id]
    );

    if (receiptLinesResult.rowCount === 0) {
      throw createError('Goods receipt must contain at least one line');
    }

    const quantitiesByPoLine = new Map();
    for (const line of receiptLinesResult.rows) {
      quantitiesByPoLine.set(
        line.po_line_id,
        (quantitiesByPoLine.get(line.po_line_id) || 0) + Number(line.qty_received)
      );
    }

    const poLineIds = [...quantitiesByPoLine.keys()].sort();
    const poLinesResult = await client.query(
      `SELECT id, qty_ordered, qty_received
       FROM po_lines
       WHERE po_id = $1 AND id = ANY($2::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [receipt.po_id, poLineIds]
    );
    const poLinesById = new Map(poLinesResult.rows.map((line) => [line.id, line]));

    for (const [poLineId, receiptQty] of quantitiesByPoLine) {
      const poLine = poLinesById.get(poLineId);
      if (!poLine) {
        throw createError('Goods receipt contains a PO line that does not belong to its purchase order');
      }

      const openQty = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (receiptQty > openQty) {
        throw createError(`Receipt qty ${receiptQty} exceeds PO line open qty ${openQty}`);
      }
    }

    for (const [poLineId, receiptQty] of quantitiesByPoLine) {
      const allocationResult = await client.query(
        `SELECT pr_line_id
         FROM pr_line_allocations
         WHERE po_line_id = $1
         ORDER BY id
         FOR SHARE`,
        [poLineId]
      );

      if (allocationResult.rowCount !== 1) {
        throw createError('PO line must have exactly one PR allocation to update received quantities');
      }

      await client.query(
        `UPDATE po_lines
         SET qty_received = qty_received + $1, updated_at = NOW()
         WHERE id = $2`,
        [receiptQty, poLineId]
      );
      await client.query(
        `UPDATE pr_lines
         SET qty_received = qty_received + $1, updated_at = NOW()
         WHERE id = $2`,
        [receiptQty, allocationResult.rows[0].pr_line_id]
      );
    }

    await client.query(
      `UPDATE goods_receipts
       SET status = 'POSTED', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getGoodsReceiptById(db, id);
}