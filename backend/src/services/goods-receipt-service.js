import { v4 as uuidv4 } from 'uuid';

// ── Mappers ──────────────────────────────────────────────

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
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
    uom: row.uom,
    qtyReceived: Number(row.qty_received),
    actualSiteCode: row.actual_site_code,
  };
}

function createGrNumber(count) {
  const next = String(Number(count) + 1).padStart(4, '0');
  return `GR-2026-${next}`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// ── Validation ───────────────────────────────────────────

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Body is required';
  }

  if (!payload.poId) {
    return 'poId is required';
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];

    if (!line.poLineId) {
      return `lines[${i}].poLineId is required`;
    }

    if (!line.actualSiteCode || typeof line.actualSiteCode !== 'string' || !line.actualSiteCode.trim()) {
      return `lines[${i}].actualSiteCode is required`;
    }

    if (!Number(line.qtyReceived) || Number(line.qtyReceived) <= 0) {
      return `lines[${i}].qtyReceived must be greater than 0`;
    }
  }

  return null;
}

// ── Queries ──────────────────────────────────────────────

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.*, po.po_number
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );

  return rows.map((row) => ({ ...mapHeader(row), poNumber: row.po_number }));
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(`SELECT * FROM goods_receipts WHERE id = $1`, [id]);

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT gl.id, gl.line_no, gl.po_line_id, gl.qty_received, gl.actual_site_code,
            pl.item_code, pl.item_name, pl.uom
     FROM gr_lines gl
     JOIN po_lines pl ON pl.id = gl.po_line_id
     WHERE gl.gr_id = $1
     ORDER BY gl.line_no ASC`,
    [id]
  );

  return {
    ...mapHeader(headerResult.rows[0]),
    lines: linesResult.rows.map(mapLine),
  };
}

// ── Create GR (with over-receipt guard) ──────────────────

export async function createGoodsReceipt(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the PO row and confirm it is SUBMITTED
    const poResult = await client.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      [payload.poId]
    );

    if (poResult.rowCount === 0) {
      const err = new Error('Purchase order not found');
      err.statusCode = 422;
      throw err;
    }

    if (poResult.rows[0].status !== 'SUBMITTED') {
      const err = new Error('Goods receipt can only be created against a SUBMITTED purchase order');
      err.statusCode = 422;
      throw err;
    }

    // Lock and validate every referenced PO line
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];

      const poLineResult = await client.query(
        `SELECT id, qty_ordered, qty_received FROM po_lines WHERE id = $1 AND po_id = $2 FOR UPDATE`,
        [line.poLineId, payload.poId]
      );

      if (poLineResult.rowCount === 0) {
        const err = new Error(`lines[${i}]: PO line not found`);
        err.statusCode = 422;
        throw err;
      }

      const poLine = poLineResult.rows[0];
      const open = Number(poLine.qty_ordered) - Number(poLine.qty_received);
      if (Number(line.qtyReceived) > open) {
        const err = new Error(
          `lines[${i}]: received qty ${line.qtyReceived} exceeds open qty ${open}`
        );
        err.statusCode = 422;
        throw err;
      }
    }

    // Generate GR number
    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grNumber = createGrNumber(countResult.rows[0].total);
    const grId = uuidv4();

    // Insert GR header
    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, grNumber, payload.poId, payload.receiptDate || null, payload.notes || null]
    );

    // Insert GR lines
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), grId, line.poLineId, i + 1, Number(line.qtyReceived), line.actualSiteCode.trim()]
      );
    }

    await client.query('COMMIT');

    return getGoodsReceiptById(db, grId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Distribute a posted receipt qty across a PO line's PR allocations ───

export async function distributeReceiptAcrossAllocations(client, poLineId, qty) {
  const { rows } = await client.query(
    `SELECT pr_line_id, allocated_qty FROM pr_line_allocations WHERE po_line_id = $1 ORDER BY created_at ASC`,
    [poLineId]
  );

  if (rows.length === 0) {
    return;
  }

  const totalAllocated = rows.reduce((sum, row) => sum + Number(row.allocated_qty), 0);
  let distributed = 0;

  for (let i = 0; i < rows.length; i++) {
    const isLast = i === rows.length - 1;
    // give the remainder to the last allocation so shares always sum to qty exactly
    const share = isLast ? round2(qty - distributed) : round2((Number(rows[i].allocated_qty) / totalAllocated) * qty);
    distributed += share;

    if (share > 0) {
      await client.query(
        `UPDATE pr_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
        [share, rows[i].pr_line_id]
      );
    }
  }
}

// ── Post GR (DRAFT → POSTED, rolls up PO/PR received qty) ───────────────

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const grResult = await client.query(
      `SELECT id, status FROM goods_receipts WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (grResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (grResult.rows[0].status !== 'DRAFT') {
      const err = new Error('Only DRAFT goods receipt can be posted');
      err.statusCode = 422;
      throw err;
    }

    const linesResult = await client.query(
      `SELECT po_line_id, qty_received FROM gr_lines WHERE gr_id = $1`,
      [id]
    );

    for (const line of linesResult.rows) {
      // Lock the PO line to prevent concurrent receipt roll-ups
      await client.query(`SELECT id FROM po_lines WHERE id = $1 FOR UPDATE`, [line.po_line_id]);

      await client.query(
        `UPDATE po_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`,
        [Number(line.qty_received), line.po_line_id]
      );

      await distributeReceiptAcrossAllocations(client, line.po_line_id, Number(line.qty_received));
    }

    await client.query(
      `UPDATE goods_receipts SET status = 'POSTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
