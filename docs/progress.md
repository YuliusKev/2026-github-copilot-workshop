# Project Progress Snapshot

_Last updated: 2026-09-28_

This document reflects the **actual current state of the code**, verified by reading source files and running the test suites (not by assumption). Update it whenever module state changes.

## 1) Module Status Overview

| Module | DB Schema | Backend API | Backend Tests | Frontend UI | Frontend wired to API | E2E Tests |
|---|---|---|---|---|---|---|
| Home / Dashboard | ✅ | n/a | n/a | ✅ | ✅ (`api.listRequisitions`) | ❌ none exist |
| Purchase Requisition (PR) | ✅ | ✅ complete | ✅ 41 passing (shared suite) | ✅ | ✅ fully wired | ❌ none exist |
| Purchase Order (PO) | ✅ | ✅ complete | ✅ (shared suite) | ✅ pages/components exist | ❌ **still placeholder/mock data** | ❌ none exist |
| Goods Receipt (GR) | ✅ tables only | ❌ not implemented | ❌ | ❌ not implemented | ❌ | ❌ |

Key takeaway: **the PO backend is fully functional and tested, but the PO frontend has not been connected to it yet.** All PO pages currently render hardcoded arrays and the "create" flow only `console.log`s the payload instead of calling the API.

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

## 3) Frontend — Purchase Order Module (Partially Implemented)

Files:
- [frontend/src/pages/POListPage.vue](../frontend/src/pages/POListPage.vue) — renders a **hardcoded `ref([...])` array** of 2 fake POs, not fetched from the API.
- [frontend/src/pages/POCreatePage.vue](../frontend/src/pages/POCreatePage.vue) — `approvedPrs` is a **hardcoded placeholder array**; `handleSubmit()` has the real API call commented out (`// const created = await api.createPurchaseOrder(payload);`) and instead just `console.log`s and redirects.
- [frontend/src/pages/PODetailPage.vue](../frontend/src/pages/PODetailPage.vue) — `po` is a **hardcoded ref object**; `submitPO()` just shows an `alert('Submit functionality coming soon')`.
- [frontend/src/components/POHeaderForm.vue](../frontend/src/components/POHeaderForm.vue) and [frontend/src/components/POLineAllocationTable.vue](../frontend/src/components/POLineAllocationTable.vue) — presentational, driven entirely by props/`v-model`, no direct API calls (correctly designed to receive real data once parent pages are wired).
- [frontend/src/api.js](../frontend/src/api.js) — **has no PO functions at all** (`createPurchaseOrder`, `listPurchaseOrders`, `getPurchaseOrder`, `submitPurchaseOrder`, `getPurchaseOrderOpenLines` are not defined here, despite tests expecting them).

### Remaining work to finish the PO backlog
1. Add PO functions to `api.js` mirroring the existing requisition pattern (`listPurchaseOrders`, `createPurchaseOrder`, `getPurchaseOrder`, `submitPurchaseOrder`, `getPurchaseOrderOpenLines`).
2. Wire `POListPage.vue` to `api.listPurchaseOrders()` on mount (pattern already used in `RequisitionListPage.vue`).
3. Wire `POCreatePage.vue` to fetch approved PRs (likely via `api.listRequisitions()` + filter `APPROVED`, or a dedicated endpoint) and call `api.createPurchaseOrder(payload)` for real, then route to the created PO's detail page.
4. Wire `PODetailPage.vue` to `api.getPurchaseOrder(id)` on mount and `api.submitPurchaseOrder(id)` on submit.
5. Reconcile field naming mismatch: backend returns camelCase fields like `vendorName`, `poNumber`, `qtyOrdered`, `unitPrice`, `lines[].allocations`, but current mock UI uses different shape (`supplierName`, `total`, `lines[].description/allocatedQty`). UI will need minor adjustments once real data is wired in.

## 4) Goods Receipt Module — Not Implemented

- Database tables `goods_receipts` and `gr_lines` exist in [db/migrations/001_init_procurement_mvp.sql](../db/migrations/001_init_procurement_mvp.sql) and are seeded in [db/seeds/002_seed_procurement_mvp.sql](../db/seeds/002_seed_procurement_mvp.sql).
- No backend routes/service, no frontend pages exist for GR.
- Confirmed out of scope per `docs/plan.md` and `.github/copilot-instructions.md` (left for self-paced exploration after the workshop backlog).

## 5) Test Suite Status (as run on 2026-09-28)

### Backend (`cd backend && npm test`)
```
Test Suites: 2 passed, 2 total
Tests:       41 passed, 41 total
```

### Frontend (`cd frontend && npm test`)
```
Test Files  3 failed | 1 passed (4)
Tests       11 failed | 36 passed (47)
```
Failing suites/reasons (all pre-existing test/component mismatches, not caused by this session):
- `POListPage.test.js` — expects `api.listPurchaseOrders()` to be called and real PO data rendered (e.g. `SUBMITTED` status, `$1500.00` total); fails because the page still uses hardcoded mock data.
- `POHeaderForm.test.js` — expects 3 `<input>` elements, component renders 4 (poTitle, deliveryDate, deliveryAddress, notes — one more than the test anticipates).
- `RequisitionListPage.test.js` — expects an empty-state message (`"No purchase requisitions yet"`) and PR number text in table rows that don't match the current markup/copy.
- Note: on a first run the frontend suite failed entirely with a Rollup/Vite parse error in `vitest.setup.js` — this was a **stale `node_modules/.vite` cache** artifact, not a real source bug; clearing the cache (`rm -rf node_modules/.vite node_modules/.vitest`) resolved it and produced the results above.

### E2E (Playwright)
- `playwright.config.js` points `testDir` at `./tests/e2e`, but **no `tests/e2e` directory exists in the repo** — there are currently zero Playwright tests.
- `playwright-report/` and `test-results/` in the repo tree are **stale generated artifacts** from a prior/different run (they reference a `gr-module` spec that does not exist in this codebase). These folders are git-ignored per `README.md` and should not be treated as current signal.

## 6) Suggested Next Steps (Priority Order)
1. Wire the three PO pages to the real backend API (see §3) — this is the core remaining backlog item.
2. Update/fix the failing frontend unit tests to match the wired components (or update components to match intended test contracts, whichever is source of truth for the workshop).
3. Add Playwright E2E coverage under `tests/e2e/` for the PR → PO → submit flow (per `docs/plan.md` §7 testing strategy).
4. Leave GR module for the optional self-paced exploration track.
