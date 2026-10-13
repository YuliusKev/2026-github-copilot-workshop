# Proposal

## Why

The procurement flow already defines goods-receipt tables, PO open lines, and receipt quantity tracking, but users cannot record or inspect deliveries. Adding GR closes the modeled PR-to-PO-to-GR flow and makes received quantities visible and trustworthy.

## What Changes

- Add a Goods Receipt capability with list, create, detail, and post workflows.
- Add REST endpoints to list receipts, create a draft receipt against a submitted PO, fetch receipt details, and post a draft receipt.
- Validate receipt lines against PO open quantities and atomically update PO and linked PR received quantities when posted.
- Add frontend list, create, and detail pages and navigation from purchase orders to receipts.
- Add focused service, UI, and end-to-end coverage, and update the documented API and workshop scope.

## Capabilities

### New Capabilities

- `goods-receipts`: Record deliveries against submitted purchase orders, inspect receipts, and post them while keeping received quantities within ordered quantities.

### Modified Capabilities

- None.

## Impact

- Backend: Fastify route registration and a new receipt service using existing PostgreSQL `goods_receipts` and `gr_lines` tables.
- API: `GET /api/goods-receipts`, `POST /api/goods-receipts`, `GET /api/goods-receipts/:id`, and `POST /api/goods-receipts/:id/post`.
- Frontend: Vue API client, router, navigation, and GR list/create/detail pages.
- Tests and documentation: Jest service tests, frontend tests, Playwright flow coverage, and `docs/plan.md` updates.
