## 1. Backend Service

- [x] 1.1 Create `backend/src/services/goods-receipt-service.js` with row mappers (`mapHeader`, `mapLine`) and a `createGrNumber` generator following the `PO-2026-0001` pattern used by `purchase-order-service.js`
- [x] 1.2 Implement `validateCreatePayload` for GR create (poId required, lines non-empty, each line has `poLineId`, `qtyReceived` > 0, `actualSiteCode`)
- [x] 1.3 Implement `createGoodsReceipt(db, payload)`: within a transaction, `FOR UPDATE` lock the referenced PO and its lines, verify PO status is `SUBMITTED`, verify each `poLineId` belongs to the PO, verify `qtyReceived` <= PO line open qty (`qty_ordered - qty_received` minus any other DRAFT GR lines already reserved against it — see design decision on posting-time roll-up, so only compare against posted `qty_received`), insert GR header (`DRAFT`) and GR lines, return the created GR
- [x] 1.4 Implement `getGoodsReceiptById(db, id)`: fetch GR header + lines joined with `po_lines` for item details; return `null` if not found
- [x] 1.5 Implement `listGoodsReceipts(db)`: return all GR headers ordered by `created_at DESC`
- [x] 1.6 Implement `distributeReceiptAcrossAllocations(client, poLineId, qty)` helper: fetch all `pr_line_allocations` for the PO line, distribute `qty` proportionally to `allocated_qty` share (rounded, remainder to last row), and increment each `pr_lines.qty_received`
- [x] 1.7 Implement `postGoodsReceipt(db, id)`: within a transaction, `FOR UPDATE` lock the GR, verify status is `DRAFT` (else 422), for each GR line increment `po_lines.qty_received` and call `distributeReceiptAcrossAllocations`, set GR status to `POSTED`, return updated GR

## 2. Backend Routes

- [x] 2.1 Create `backend/src/routes/goods-receipt-routes.js` with `POST /api/goods-receipts`, `POST /api/goods-receipts/:id/post`, `GET /api/goods-receipts/:id`, `GET /api/goods-receipts` (list), following the try/catch + `error.statusCode` pattern from `purchase-order-routes.js`
- [x] 2.2 Register `goodsReceiptRoutes` in `backend/src/app.js` alongside the existing PO/PR route registrations

## 3. Backend Tests

- [x] 3.1 Add `backend/tests/services/goods-receipt-service.test.js` covering: successful create, reject create against non-SUBMITTED PO, reject over-receipt, reject unknown PO line, successful post updates po_lines/pr_lines quantities, reject double-post
- [x] 3.2 Add a test for `distributeReceiptAcrossAllocations` proportional split across two PR-line allocations on the same PO line
- [x] 3.3 Run `npm test` in `backend/` and confirm all existing + new tests pass

## 4. Frontend API Client

- [x] 4.1 Add `listGoodsReceipts()`, `createGoodsReceipt(payload)`, `getGoodsReceipt(id)`, `postGoodsReceipt(id)` functions to `frontend/src/api.js`, matching the existing `apiFetch` helper pattern used by PO/PR functions

## 5. Frontend Pages & Components

- [x] 5.1 Create `frontend/src/components/GRLineReceiptTable.vue` (reusable line-quantity entry table, mirrors `POLineAllocationTable.vue`): fetches PO open lines, validates `qtyReceived` > 0 and <= `qtyOpenForGr`, exposes `validateLines()` for the parent
- [x] 5.2 Create `frontend/src/pages/GRCreatePage.vue`: PO picker filtered client-side to `status === 'SUBMITTED'` (mirrors `POHeaderForm.vue`'s PR filtering), composes `GRLineReceiptTable.vue`, submits via `createGoodsReceipt`
- [x] 5.3 Create `frontend/src/pages/GRListPage.vue`: table of GRs (GR Number | PO Number | Status | Created At | Action), status badges reusing global `.status-badge` styles (draft/posted), links to detail
- [x] 5.4 Create `frontend/src/pages/GRDetailPage.vue`: header info, lines table, Post button (disabled once `POSTED`), calls `postGoodsReceipt` and reassigns local state with the response, mirroring `PODetailPage.vue`
- [x] 5.5 Add GR routes (`/goods-receipts`, `/goods-receipts/new`, `/goods-receipts/:id`) to `frontend/src/router/index.js`
- [x] 5.6 Add a "Goods Receipts" nav link to `frontend/src/App.vue`, following the existing PO/PR nav link pattern
- [x] 5.7 Add a "Create GR" action link from `PODetailPage.vue` for SUBMITTED POs with open lines, mirroring how PR detail links to PO create

## 6. Frontend Tests

- [x] 6.1 Add `frontend/src/components/__tests__/GRLineReceiptTable.test.js` covering quantity validation (over-receipt, non-positive)
- [x] 6.2 Add `frontend/src/pages/__tests__/GRListPage.test.js` mirroring `POListPage.test.js` conventions
- [x] 6.3 Run `npm test` in `frontend/` and confirm all existing + new tests pass

## 7. End-to-End Verification

- [x] 7.1 Manually verify via `docker compose up -d db` + running backend/frontend dev servers: create PR -> approve -> create PO -> submit PO -> create GR -> post GR -> confirm PR/PO quantities update correctly
- [ ] 7.2 (skipped per user request) Optionally extend the existing Playwright PO spec (or add a new `tests/e2e/gr-module.spec.js`) covering the GR creation and posting flow on top of a submitted PO
- [x] 7.3 Update `docs/progress.md` to reflect GR module completion
