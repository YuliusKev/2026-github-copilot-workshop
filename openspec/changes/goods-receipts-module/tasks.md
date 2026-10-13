# Tasks

## 1. Receipt API and Service

- [x] 1.1 Implement receipt listing, detail mapping, payload validation, and transactional draft creation using the existing tables; add Jest tests for empty/list results, valid creation, invalid PO/line membership, empty lines, and non-positive or excessive quantities, and verify with `rtk npm --prefix backend test -- --runInBand tests/services/goods-receipt-service.test.js`.
- [x] 1.2 Implement atomic posting with receipt and PO-line locks, aggregate revalidation, status transition, and PO/linked-PR counter updates; add tests for successful posting, already-posted/missing receipts, stale drafts, and rollback without partial counter changes, and verify with `rtk npm --prefix backend test -- --runInBand tests/services/goods-receipt-service.test.js`.
- [x] 1.3 Add `GET /api/goods-receipts`, `POST /api/goods-receipts`, `GET /api/goods-receipts/:id`, and `POST /api/goods-receipts/:id/post`, register the routes, and test response codes/error bodies through Fastify injection; verify with `rtk npm --prefix backend test -- --runInBand`.

## 2. Goods Receipt UI

- [x] 2.1 Add receipt API client methods, list/create/detail routes, navigation, and a PO-detail entry point; add frontend tests for navigation and page loading, and verify with `rtk npm --prefix frontend test`.
- [x] 2.2 Build the GR list, create, and detail views using PO open lines, default actual site from each PO line, and expose validation/posting errors without losing the draft; add component/page tests for line selection, quantities, and error states, and verify with `rtk npm --prefix frontend test`.

## 3. End-to-End Flow and Documentation

- [x] 3.1 Add a Playwright flow that creates a receipt against a submitted PO, confirms it appears in the list and detail, posts it, and verifies posted status and reduced PO open quantity; verify with `rtk npm run test:e2e -- tests/e2e/goods-receipt-module.spec.js --workers=1`.
- [x] 3.2 Update `docs/plan.md` and the relevant application guide to document the GR endpoints, list endpoint, posting rules, and revised workshop scope; verify the docs match the implemented routes and pages.
- [x] 3.3 Run the full backend and frontend Jest suites plus the GR Playwright flow with the API, frontend, and PostgreSQL running; verify all checks pass and report any environment-dependent checks not run.
