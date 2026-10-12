import { v4 as uuidv4 } from 'uuid';

// ── Mappers ──────────────────────────────────────────────

function mapHeader(row) {
  return {
    id: row.id,
    poNumber: row.po_number,
    status: row.status,
    vendorName: row.vendor_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    lineNo: row.line_no,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyOrdered: Number(row.qty_ordered),
    qtyReceived: Number(row.qty_received),
    qtyOpenForGr: Number(row.qty_ordered) - Number(row.qty_received),
    uom: row.uom,
    unitPrice: Number(row.unit_price),
    siteCode: row.site_code,
    requiredDate: row.required_date,
  };
}

function createPoNumber(count) {
  const next = String(Number(count) + 1).padStart(4, '0');
  return `PO-2026-${next}`;
}

// ── Validation ───────────────────────────────────────────

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Body is required';
  }

  if (!payload.vendorName || typeof payload.vendorName !== 'string' || !payload.vendorName.trim()) {
    return 'vendorName is required';
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return 'lines must contain at least one item';
  }

  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i];

    if (!line || typeof line !== 'object') {
      return `lines[${i}] must be an object`;
    }

    if (!line.prLineId) {
      return `lines[${i}].prLineId is required`;
    }

    if (!line.itemCode || !line.itemName || !line.uom || !line.siteCode) {
      return `lines[${i}] itemCode, itemName, uom, and siteCode are required`;
    }

    if (!Number.isFinite(Number(line.qtyOrdered)) || Number(line.qtyOrdered) <= 0) {
      return `lines[${i}].qtyOrdered must be greater than 0`;
    }

    if (!Number.isFinite(Number(line.unitPrice ?? 0)) || Number(line.unitPrice ?? 0) < 0) {
      return `lines[${i}].unitPrice must be greater than or equal to 0`;
    }
  }

  return null;
}

// ── Queries ──────────────────────────────────────────────

export async function listPurchaseOrders(db) {
  const { rows } = await db.query(
    `SELECT id, po_number, status, vendor_name, created_at, updated_at
     FROM purchase_orders
     ORDER BY created_at DESC`
  );

  return rows.map(mapHeader);
}

export async function getPurchaseOrderById(db, id) {
  const headerResult = await db.query(
    `SELECT * FROM purchase_orders WHERE id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT * FROM po_lines WHERE po_id = $1 ORDER BY line_no ASC`,
    [id]
  );

  // For each PO line, fetch its allocation source (PR line info)
  const lines = [];
  for (const row of linesResult.rows) {
    const allocResult = await db.query(
      `SELECT a.pr_line_id, a.allocated_qty, pl.pr_id,
              pr.pr_number
       FROM pr_line_allocations a
       JOIN pr_lines pl ON pl.id = a.pr_line_id
       JOIN purchase_requisitions pr ON pr.id = pl.pr_id
       WHERE a.po_line_id = $1`,
      [row.id]
    );

    const mapped = mapLine(row);
    mapped.allocations = allocResult.rows.map((a) => ({
      prLineId: a.pr_line_id,
      prNumber: a.pr_number,
      allocatedQty: Number(a.allocated_qty),
    }));
    lines.push(mapped);
  }

  return {
    ...mapHeader(headerResult.rows[0]),
    lines,
  };
}

export async function getOpenPoLines(db, id) {
  const headerResult = await db.query(
    `SELECT id, po_number, status FROM purchase_orders WHERE id = $1`,
    [id]
  );

  if (headerResult.rowCount === 0) {
    return null;
  }

  const linesResult = await db.query(
    `SELECT * FROM po_lines WHERE po_id = $1 ORDER BY line_no ASC`,
    [id]
  );

  const openLines = linesResult.rows
    .map(mapLine)
    .filter((line) => line.qtyOpenForGr > 0);

  return {
    purchaseOrder: {
      id: headerResult.rows[0].id,
      poNumber: headerResult.rows[0].po_number,
      status: headerResult.rows[0].status,
    },
    openLines,
  };
}

// ── Create PO (with over-allocation guard) ───────────────

export async function createPurchaseOrder(db, payload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const requestedByPrLine = new Map();

    // Lock and validate every referenced PR line
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];

      // Lock the PR line row to prevent concurrent over-allocation
      const prLineResult = await client.query(
        `SELECT pl.id, pl.qty_requested, pl.qty_allocated, pr.status AS pr_status
         FROM pr_lines pl
         JOIN purchase_requisitions pr ON pr.id = pl.pr_id
         WHERE pl.id = $1
         FOR UPDATE`,
        [line.prLineId]
      );

      if (prLineResult.rowCount === 0) {
        const err = new Error(`lines[${i}]: PR line not found`);
        err.statusCode = 422;
        throw err;
      }

      const prLine = prLineResult.rows[0];

      if (prLine.pr_status !== 'APPROVED') {
        const err = new Error(`lines[${i}]: PR must be APPROVED before allocation`);
        err.statusCode = 422;
        throw err;
      }

      const remaining = Number(prLine.qty_requested) - Number(prLine.qty_allocated);
      const requestedQty = (requestedByPrLine.get(line.prLineId) || 0) + Number(line.qtyOrdered);
      if (requestedQty > remaining) {
        const err = new Error(
          `lines[${i}]: allocation qty ${requestedQty} exceeds remaining ${remaining}`
        );
        err.statusCode = 422;
        throw err;
      }
      requestedByPrLine.set(line.prLineId, requestedQty);
    }

    // Generate PO number
    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM purchase_orders`);
    const poNumber = createPoNumber(countResult.rows[0].total);
    const poId = uuidv4();

    // Insert PO header
    await client.query(
      `INSERT INTO purchase_orders (id, po_number, status, vendor_name)
       VALUES ($1, $2, 'DRAFT', $3)`,
      [poId, poNumber, payload.vendorName.trim()]
    );

    // Insert PO lines, allocations, and update pr_lines.qty_allocated
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      const poLineId = uuidv4();

      await client.query(
        `INSERT INTO po_lines (
          id, po_id, line_no, item_code, item_name, qty_ordered, qty_received,
          uom, unit_price, site_code, required_date
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)`,
        [
          poLineId,
          poId,
          i + 1,
          line.itemCode,
          line.itemName,
          Number(line.qtyOrdered),
          line.uom,
          Number(line.unitPrice || 0),
          line.siteCode,
          line.requiredDate || null,
        ]
      );

      // Create allocation record
      await client.query(
        `INSERT INTO pr_line_allocations (id, pr_line_id, po_line_id, allocated_qty)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), line.prLineId, poLineId, Number(line.qtyOrdered)]
      );

      // Update denormalized qty_allocated on PR line
      await client.query(
        `UPDATE pr_lines
         SET qty_allocated = qty_allocated + $1, updated_at = NOW()
         WHERE id = $2`,
        [Number(line.qtyOrdered), line.prLineId]
      );
    }

    await client.query('COMMIT');

    return getPurchaseOrderById(db, poId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Submit PO (DRAFT → SUBMITTED) ───────────────────────

export async function submitPurchaseOrder(db, id) {
  const currentResult = await db.query(
    `SELECT id, status FROM purchase_orders WHERE id = $1`,
    [id]
  );

  if (currentResult.rowCount === 0) {
    return null;
  }

  if (currentResult.rows[0].status !== 'DRAFT') {
    const err = new Error('Only DRAFT purchase order can be submitted');
    err.statusCode = 422;
    throw err;
  }

  await db.query(
    `UPDATE purchase_orders
     SET status = 'SUBMITTED', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  return getPurchaseOrderById(db, id);
}
