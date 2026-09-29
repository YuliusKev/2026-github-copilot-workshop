## Why

The procurement MVP flow is PR -> PO -> GR, but the Goods Receipt (GR) stage is completely unimplemented: the schema exists (`goods_receipts`, `gr_lines`) but there are no backend routes/services, no frontend pages, and no API client functions. Without GR, a PO's received quantities can never be updated and the PR/PO/GR traceability loop described in `docs/plan.md` cannot be demonstrated end-to-end.

## What Changes

- Add backend GR service + routes implementing the three planned endpoints:
  - `POST /api/goods-receipts` (create a DRAFT GR from PO open lines)
  - `POST /api/goods-receipts/:id/post` (post the GR, updating `po_lines.qty_received` and `pr_lines.qty_received` via the allocation chain)
  - `GET /api/goods-receipts/:id` (fetch GR header + lines)
- Enforce GR business rules server-side:
  - Received qty per line must be > 0
  - Received qty must be <= PO line open qty (`qty_ordered - qty_received`)
  - GR can only be created against a `SUBMITTED` PO
  - GR can only be posted while `DRAFT`; posting is idempotent-safe (cannot post twice)
- Add `GET /api/purchase-orders/:id/open-lines` consumption on the frontend to drive GR line selection (endpoint already exists; no backend change needed there).
- Add frontend GR pages: GR List, GR Create (select PO with open lines, enter receipt quantities), GR Detail (view posted/draft GR, post action).
- Add GR API client functions in `frontend/src/api.js` (`listGoodsReceipts`, `createGoodsReceipt`, `getGoodsReceipt`, `postGoodsReceipt`).
- Wire GR navigation/routes into the existing router and nav bar, following the same patterns as the PO module.
- Add Jest tests for GR service rules (over-receipt rejection, status transitions) and Vitest coverage for GR pages/components.

## Capabilities

### New Capabilities
- `goods-receipts`: Create, post, and view Goods Receipts against submitted Purchase Orders, including over-receipt validation and PO/PR quantity roll-up.

### Modified Capabilities
(none — PR and PO requirement behavior is unchanged; GR posting only writes to existing denormalized `qty_received` columns per the already-documented data model)

## Impact

- **Backend**: new `backend/src/services/goods-receipt-service.js`, new `backend/src/routes/goods-receipt-routes.js`, registration in `backend/src/app.js`.
- **Frontend**: new `frontend/src/pages/GRListPage.vue`, `GRCreatePage.vue`, `GRDetailPage.vue`; new component(s) for line-quantity entry (mirroring `POLineAllocationTable.vue`); updates to `frontend/src/api.js`, `frontend/src/router/index.js`, `frontend/src/App.vue` nav.
- **Database**: no migration changes — `goods_receipts`/`gr_lines` tables already exist in `db/migrations/001_init_procurement_mvp.sql`.
- **Tests**: new `backend/tests/services/goods-receipt-service.test.js`; new frontend component/page tests; optional Playwright coverage extending the existing PO flow spec.
