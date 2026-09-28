# Project Progress Snapshot

_Last updated: 2026-09-28 (PO module fully wired and tested)_

This document reflects the **actual current state of the code**, verified by reading source files and running the test suites (not by assumption). Update it whenever module state changes.

## 1) Module Status Overview

| Module | DB Schema | Backend API | Backend Tests | Frontend UI | Frontend wired to API | E2E Tests |
|---|---|---|---|---|---|---|
| Home / Dashboard | ✅ | n/a | n/a | ✅ | ✅ (`api.listRequisitions`) | ❌ none exist |
| Purchase Requisition (PR) | ✅ | ✅ complete | ✅ 41 passing (shared suite) | ✅ | ✅ fully wired | ❌ none exist |
| Purchase Order (PO) | ✅ | ✅ complete | ✅ (shared suite) | ✅ all pages complete | ✅ **fully wired** | ❌ none exist |
| Goods Receipt (GR) | ✅ tables only | ❌ not implemented | ❌ | ❌ not implemented | ❌ | ❌ |

Key takeaway: **PO module is now feature-complete and fully wired to the backend API.** All three pages (list, create, detail) fetch live data and trigger API actions (create, submit).

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

## 4) Goods Receipt Module — Not Implemented

- Database tables `goods_receipts` and `gr_lines` exist in [db/migrations/001_init_procurement_mvp.sql](../db/migrations/001_init_procurement_mvp.sql) and are seeded in [db/seeds/002_seed_procurement_mvp.sql](../db/seeds/002_seed_procurement_mvp.sql).
- No backend routes/service, no frontend pages exist for GR.
- Confirmed out of scope per `docs/plan.md` and `.github/copilot-instructions.md` (left for self-paced exploration after the workshop backlog).

## 5) Test Suite Status (as run on 2026-09-28 final)

### Backend (`cd backend && npm test`)
```
Test Suites: 2 passed, 2 total
Tests:       41 passed, 41 total
```

### Frontend (`cd frontend && npm test`)
```
Test Files  4 passed (4)
Tests       47 passed (47)
```
All frontend tests now pass. [POListPage.test.js](../frontend/src/pages/__tests__/POListPage.test.js) was completely rewritten to match the real API contract (previous version mocked fictitious `supplierName`/`total` fields that never existed in backend).

### E2E (Playwright)
- `playwright.config.js` points `testDir` at `./tests/e2e`, but **no `tests/e2e` directory exists in the repo** — there are currently zero Playwright tests.
- `playwright-report/` and `test-results/` in the repo tree are **stale generated artifacts** from a prior/different run (they reference a `gr-module` spec that does not exist in this codebase). These folders are git-ignored per `README.md` and should not be treated as current signal.

## 6) Suggested Next Steps (Priority Order)
1. **Add Playwright E2E coverage** under `tests/e2e/` for the core workflows (PR → PO creation → PO submit flow), per `docs/plan.md` §7 testing strategy.
2. **Optional: Implement the Goods Receipt (GR) module** — self-paced exploration after the PO backlog. DB schema exists; API/frontend/tests remain to be built following the same patterns as PR/PO.
3. **Optional: Add a Bookmark feature** — drive via GitHub Issue creation workflow (post-backlog practice).
