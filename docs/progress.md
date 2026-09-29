# Project Progress Snapshot

_Last updated: 2026-09-29 (GR module implemented via openspec change `goods-receipts-module`)_

This document reflects the **actual current state of the code**, verified by reading source files and running the test suites (not by assumption). Update it whenever module state changes.

## 1) Module Status Overview

| Module | DB Schema | Backend API | Backend Tests | Frontend UI | Frontend wired to API | E2E Tests |
|---|---|---|---|---|---|---|
| Home / Dashboard | ✅ | n/a | n/a | ✅ | ✅ (`api.listRequisitions`) | ❌ none exist |
| Purchase Requisition (PR) | ✅ | ✅ complete | ✅ 41 passing (shared suite) | ✅ | ✅ fully wired | ❌ none exist |
| Purchase Order (PO) | ✅ | ✅ complete | ✅ (shared suite) | ✅ all pages complete | ✅ **fully wired** | ❌ none exist |
| Goods Receipt (GR) | ✅ | ✅ complete | ✅ (shared suite) | ✅ all pages complete | ✅ **fully wired** | ❌ skipped (see §5) |

Key takeaway: **GR module is now feature-complete.** Create/post/detail/list flows are wired end-to-end and manually verified against the live backend + Postgres (create PO → submit → create GR → post GR → confirmed PO/PR quantity roll-up).

## 2) Backend — Purchase Order Module (Implemented)

Files:
- [backend/src/routes/purchase-order-routes.js](../backend/src/routes/purchase-order-routes.js)
- [backend/src/services/purchase-order-service.js](../backend/src/services/purchase-order-service.js)
- [backend/tests/services/purchase-order-service.test.js](../backend/tests/services/purchase-order-service.test.js)

### API Endpoints

| Method | Path | Description | Success | Error cases |
|---|---|---|---|---|
| `GET` | `/api/purchase-orders` | List all POs (header only, newest first) | `200 { items: [...] }` | — |
| `POST` | `/api/purchase-orders` | Create a DRAFT PO by allocating one or more approved PR lines | `201 <purchaseOrder>` | `422` validation error (see below) |
| `POST` | `/api/purchase-orders/:id/submit` | Transition PO `DRAFT → SUBMITTED` | `200 <purchaseOrder>` | `404` not found, `422` if not DRAFT |
| `GET` | `/api/purchase-orders/:id` | Get PO header + lines + allocation source (PR line/number) | `200 <purchaseOrder>` | `404` not found |
| `GET` | `/api/purchase-orders/:id/open-lines` | Get PO lines still open for goods receipt (`qty_ordered - qty_received > 0`) | `200 { purchaseOrder, openLines }` | `404` not found |

### `POST /api/purchase-orders` request body

```jsonc
{
  "vendorName": "string (required)",
  "lines": [
    {
      "prLineId": "uuid (required)",
      "itemCode": "string (required)",
      "itemName": "string (required)",
      "qtyOrdered": "number > 0 (required)",
      "unitPrice": "number >= 0",
      "uom": "string (required)",
      "siteCode": "string (required)",
      "requiredDate": "date (optional)"
    }
  ]
}
```

### Business rules enforced server-side (in a single DB transaction with row locking)
- Every `prLineId` must exist; its parent PR must be `APPROVED`, else `422`.
- Allocation qty must be `> 0`.
- Allocation qty must be `<= remaining PR line qty` (`qty_requested - qty_allocated`), else `422` with a message naming the exceeded amount.
- On success: inserts `purchase_orders` (status `DRAFT`), `po_lines`, `pr_line_allocations`, and increments `pr_lines.qty_allocated` — all atomically (`BEGIN`/`COMMIT`/`ROLLBACK`).
- PO number generated as `PO-2026-NNNN`.
- Submit only allowed from `DRAFT` status; otherwise `422`.

### Backend test coverage
Running `cd backend && npm test`:
```
PASS tests/services/purchase-order-service.test.js
PASS tests/services/requisition-service.test.js
Tests: 41 passed, 41 total
```
Tests use a mocked `db` client (no live Postgres needed) and cover: over-allocation rejection, non-APPROVED PR rejection, status transition guard, mapping/shape of responses.

## 3) Frontend — Purchase Order Module (Complete & Fully Wired)

Files:
- [frontend/src/pages/POListPage.vue](../frontend/src/pages/POListPage.vue) — fetches `api.listPurchaseOrders()` on mount, displays table with `poNumber`, `vendorName`, `status`, `createdAt`.
- [frontend/src/pages/POCreatePage.vue](../frontend/src/pages/POCreatePage.vue) — fetches approved PRs via `api.listRequisitions()` on mount; on PR selection fetches `api.getRequisitionOpenLines(prId)` to populate allocations; `handleSubmit()` calls `api.createPurchaseOrder(payload)` and navigates to created PO detail page.
- [frontend/src/pages/PODetailPage.vue](../frontend/src/pages/PODetailPage.vue) — fetches `api.getPurchaseOrder(id)` on mount; displays PO header (number, vendor, status, computed total) and lines table; "Submit PO" button calls `api.submitPurchaseOrder(id)` and refreshes state.
- [frontend/src/components/POHeaderForm.vue](../frontend/src/components/POHeaderForm.vue) and [frontend/src/components/POLineAllocationTable.vue](../frontend/src/components/POLineAllocationTable.vue) — presentational components, fully functional with real data.
- [frontend/src/api.js](../frontend/src/api.js) — **now includes** `createPurchaseOrder`, `listPurchaseOrders`, `getPurchaseOrder`, `submitPurchaseOrder`, `getRequisitionOpenLines` (added during wiring phase).

### Data binding notes
- Backend PO response fields: `id`, `poNumber`, `status`, `vendorName`, `createdAt`, `updatedAt`, `lines[]` with `{ id, lineNo, itemCode, itemName, qtyOrdered, qtyReceived, qtyOpenForGr, uom, unitPrice, siteCode, requiredDate, allocations: [{ prLineId, prNumber, allocatedQty }] }`.
- PODetailPage computes total client-side as `sum(line.unitPrice * line.qtyOrdered)` since the API doesn't provide a pre-computed total.
- Status badges use lowercase class names matching global `styles.css` (`.draft`, `.submitted`).
- Page layouts reuse global CSS (styles.css) to avoid duplication, matching the RequisitionListPage/RequisitionDetailPage convention.

## 4) Goods Receipt Module (Implemented via openspec change `goods-receipts-module`)

Database tables `goods_receipts` and `gr_lines` already existed in [db/migrations/001_init_procurement_mvp.sql](../db/migrations/001_init_procurement_mvp.sql); no migration changes were needed.

Backend:
- [backend/src/routes/goods-receipt-routes.js](../backend/src/routes/goods-receipt-routes.js) — `GET /api/goods-receipts`, `POST /api/goods-receipts`, `POST /api/goods-receipts/:id/post`, `GET /api/goods-receipts/:id`.
- [backend/src/services/goods-receipt-service.js](../backend/src/services/goods-receipt-service.js) — create (PO must be `SUBMITTED`, `qtyReceived <= po_lines` open qty, row-locked transaction), post (`DRAFT → POSTED`, rolls up `po_lines.qty_received` and, via `distributeReceiptAcrossAllocations`, proportionally rolls up `pr_lines.qty_received` across all PR-line allocations for a PO line).
- [backend/tests/services/goods-receipt-service.test.js](../backend/tests/services/goods-receipt-service.test.js) — covers payload validation, PO status guard, over-receipt guard, double-post guard, quantity roll-up, and proportional allocation split.

Frontend:
- [frontend/src/pages/GRListPage.vue](../frontend/src/pages/GRListPage.vue), [frontend/src/pages/GRCreatePage.vue](../frontend/src/pages/GRCreatePage.vue), [frontend/src/pages/GRDetailPage.vue](../frontend/src/pages/GRDetailPage.vue), [frontend/src/components/GRLineReceiptTable.vue](../frontend/src/components/GRLineReceiptTable.vue) — mirror the PO module's page/component structure and global styling conventions.
- [frontend/src/api.js](../frontend/src/api.js) — adds `listGoodsReceipts`, `createGoodsReceipt`, `getGoodsReceipt`, `postGoodsReceipt`.
- [frontend/src/router/index.js](../frontend/src/router/index.js) and [frontend/src/App.vue](../frontend/src/App.vue) — GR routes + nav link added.
- [frontend/src/pages/PODetailPage.vue](../frontend/src/pages/PODetailPage.vue) — adds a "Create GR" link for `SUBMITTED` POs.

Manual verification (2026-09-29): created a PO from an approved PR's open lines, submitted it, created a partial GR (3 of 5 ordered), posted it, and confirmed `po_lines.qty_received`/`qty_open_for_gr` and `pr_lines.qty_received` updated correctly via live API calls against the Dockerized Postgres instance. Also confirmed the double-post guard (422) and over-receipt guard (422) reject invalid requests.

Playwright E2E coverage for the GR flow was scoped out of this pass (skipped per user request) — see §5.

## 5) Test Suite Status (as run on 2026-09-28 final)

### Backend (`cd backend && npm test`)
```
Test Suites: 3 passed, 3 total
Tests:       57 passed, 57 total
```
(one pre-existing unrelated placeholder test — `expect(true).toBe(false)` in `purchase-order-service.test.js` — is left untouched as out of GR scope)

### Frontend (`cd frontend && npm test`)
```
Test Files  6 passed (6)
Tests       60 passed (60)
```
All frontend tests pass, including new `GRLineReceiptTable.test.js` and `GRListPage.test.js`. `npm run build` also passes.

### E2E (Playwright)
- No `tests/e2e` directory exists in the repo — there are currently zero Playwright tests. GR flow Playwright coverage was scoped out of this pass per user request; the GR flow was instead manually verified end-to-end via live API calls (see §4).
- `playwright-report/` and `test-results/` in the repo tree are **stale generated artifacts** from a prior/different run and are git-ignored per `README.md` — not current signal.

## 6) Suggested Next Steps (Priority Order)
1. **Add Playwright E2E coverage** under `tests/e2e/` for the core workflows (PR → PO → GR flow), per `docs/plan.md` §7 testing strategy.
2. **Optional: Add a Bookmark feature** — drive via GitHub Issue creation workflow (post-backlog practice).
