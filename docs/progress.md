# Project Progress

**Snapshot date:** 2026-10-13

## Current State

This repository is a procurement MVP workshop project using Fastify and PostgreSQL for the backend, Vue 3 and Vite for the frontend, Jest for backend unit tests, Vitest for frontend tests, and Playwright for browser tests. PostgreSQL 16 runs through [Docker Compose](../docker-compose.yml) on host port `5433`, with a persistent volume and automatic initialization from the provided [migration](../db/migrations/001_init_procurement_mvp.sql) and [seed](../db/seeds/002_seed_procurement_mvp.sql). The default API and frontend ports are `3000` and `5173`.

The baseline Purchase Requisition flow is implemented: a PR-based dashboard, requisition list/create/detail pages, and requisition APIs for listing, creating, submitting, approving, reading details, and retrieving open lines. PR transitions are `DRAFT -> SUBMITTED -> APPROVED`. Registered PR endpoints are `GET /api/requisitions`, `POST /api/requisitions`, `GET /api/requisitions/:id`, `POST /api/requisitions/:id/submit`, `POST /api/requisitions/:id/approve`, and `GET /api/requisitions/:id/open-lines`.

The [Purchase Order service](../backend/src/services/purchase-order-service.js) implements listing, creation from approved PR lines, submission, detail reads, and open-for-receipt line reads. Creation validates required fields, malformed line entries, finite positive quantities, and finite nonnegative prices. It uses a database transaction and row locks, rejects unapproved or missing PR lines, and checks cumulative requested quantities when the same PR line ID appears multiple times. Creation inserts PO lines and allocation records and updates PR allocated quantities atomically. Business-rule violations return `422` with clear messages; PO submission permits `DRAFT -> SUBMITTED` only.

The [PO create page](../frontend/src/pages/PurchaseOrderCreatePage.vue) at `/purchase-orders/new` is integrated with the backend and uses the existing header and allocation components. Its [composable](../frontend/src/composables/usePurchaseOrderCreate.js) loads open lines from approved PRs, supports selection and quantity/price entry, calculates totals, refreshes remaining quantities while retaining inputs, and displays loading, empty, success, and error states. Save As Draft creates a PO; Submit PO creates a draft if needed and submits it. Submission retries reuse the saved draft rather than creating another PO. Fields are locked after saving because there is no update endpoint.

The PO list at `/purchase-orders` loads headers from `GET /api/purchase-orders`, links each PO to its detail, and links to creation. The PO detail at `/purchase-orders/:id` displays the vendor, status, lines, received/open quantities, and PR allocations from `GET /api/purchase-orders/:id`; draft POs can be submitted from this page. Both pages show API errors and appropriate loading or empty states. The shared navigation links to the PO list. The detail table scrolls horizontally on narrow screens.

The [API client](../frontend/src/api.js) exposes PO list, create, submit, detail, and open-line methods and preserves HTTP status codes on errors. The list page uses list; create uses create/submit; detail uses detail/submit. The open-lines endpoint is available for future GR work but is not used by the current PO pages. No Goods Receipt API or UI flow is registered; GR remains outside workshop implementation scope.

## Frontend Routes

The [router](../frontend/src/router/index.js) currently registers:

| Route                  | Implemented View                                  |
| ---------------------- | ------------------------------------------------- |
| `/`                    | Dashboard with PR totals and recent requisitions. |
| `/requisitions`        | PR list.                                          |
| `/requisitions/new`    | PR create.                                        |
| `/requisitions/:id`    | PR detail with submit/approve flow.               |
| `/purchase-orders`     | PO list with links to details and creation.       |
| `/purchase-orders/new` | API-backed PO create/save/submit.                 |
| `/purchase-orders/:id` | PO detail with draft submission.                  |

## Purchase Order API

All five endpoints below are defined in [PO routes](../backend/src/routes/purchase-order-routes.js) and registered in the [Fastify application](../backend/src/app.js).

| Method | Endpoint                              | Behavior                                                                                                                                                                                              |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/purchase-orders`                | Returns `{ items: [...] }` with PO headers, newest first.                                                                                                                                             |
| `POST` | `/api/purchase-orders`                | Creates a draft PO and allocations from approved PR lines; returns the PO detail with `201`. Invalid payloads, missing PR lines, unapproved PRs, and over-allocation return `422` with `{ message }`. |
| `POST` | `/api/purchase-orders/:id/submit`     | Changes a draft PO to `SUBMITTED`; returns the updated PO. Missing PO returns `404`; invalid transition returns `422`.                                                                                |
| `GET`  | `/api/purchase-orders/:id`            | Returns the PO header, lines, and their PR allocations. Missing PO returns `404`.                                                                                                                     |
| `GET`  | `/api/purchase-orders/:id/open-lines` | Returns PO lines with quantity remaining for goods receipt. Missing PO returns `404`.                                                                                                                 |

Successful reads and submission return `200`. Error responses use `{ "message": "..." }`. Detail includes header fields, lines, and PR allocations; open-lines returns `{ purchaseOrder, openLines }`, retaining only lines where `qtyOrdered - qtyReceived > 0`. The open-lines endpoint does not itself create goods receipts or require the PO to be submitted.

Creation accepts `vendorName` and a nonempty `lines` array. Each line requires `prLineId`, `itemCode`, `itemName`, `uom`, `siteCode`, and positive `qtyOrdered`; `unitPrice` defaults to zero and `requiredDate` is optional. The page maps delivery address to `siteCode`, defaulting to the source PR site, and delivery date to `requiredDate`, falling back to header Needed By date.

Examples of rule errors are `lines[0]: allocation qty 3 exceeds remaining 2` and `Only DRAFT purchase order can be submitted`. The server remains authoritative when remaining quantities change after the page loads.

There are no PO update/delete endpoints. Saved drafts can be reopened from the list and reviewed or submitted on their detail page, but their fields cannot be edited.

## Tests and Gaps

- [Backend PO service tests](../backend/tests/services/purchase-order-service.test.js) cover malformed/numeric input, approved-PR checks, individual and cumulative over-allocation, exact remaining quantity, rollback/release, creation, listing, open lines, and submission status transitions. PR service tests also exist.
- [Frontend page tests](../frontend/src/__tests__/pages.test.js) cover baseline PR rendering, PO list/detail rendering and draft submission, plus PO create payload mapping, draft creation, direct submission, retry reuse, local validation, stale server errors, refresh, and loading/empty states. [Component tests](../frontend/src/__tests__/components.test.js) cover header updates and allocation inputs.
- [Playwright PO specs](../tests/e2e/purchase-order-create.spec.js) exercise real PR creation/approval and PO save/submit, HTTP `422` allocation/transition errors, API detail/open-line reads, exact remaining quantity, and mobile PO create bounds/table scrolling. They require running frontend, API, PostgreSQL, and Chromium. Dedicated test records remain in the local database; existing requisitions are not modified. The browser flow does not yet visit the PO list or detail pages.
- Dedicated route-level unit tests are absent; Playwright covers selected HTTP contracts rather than every route/error case.
- Currency, payment terms, and notes remain in the generated UI but are not persisted by the current PO schema/API.
- Saved drafts can be reopened and submitted from PO detail, but there is no PO update endpoint or edit workflow.
- Existing shared navigation overflows at a narrow mobile viewport. PO-specific layout checks pass; global navigation responsiveness remains a separate gap.

## Latest Verification

Checks run against the current source state on 2026-10-13:

| Check                                                                                        | Most Recent Result                                                                            |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `rtk npm --prefix backend test -- --runInBand tests/services/purchase-order-service.test.js` | 30 Jest tests passed.                                                                         |
| `rtk npm --prefix frontend test`                                                             | 15 Vitest tests passed.                                                                       |
| `rtk npm --prefix frontend run build`                                                        | Production build passed.                                                                      |
| `rtk npm run test:e2e -- tests/e2e/purchase-order-create.spec.js --workers=1`                | Not rerun for this snapshot; the preceding 2026-10-12 record reports 2 Chromium tests passed. |

These results do not represent a full backend-suite or coverage run.

## Next Work

1. Add Playwright coverage that visits the PO list and detail UI, including a saved draft submission from detail.
2. Add focused route tests for response shapes, status codes, missing records, and invalid transitions not already covered by service tests or the browser flow.
3. Connect approved PR detail to PO creation with relevant PR context, if this remains in the workshop acceptance scope.
4. Resolve shared mobile navigation overflow separately; preserve baseline design tokens and existing PO components.
5. Keep GR work deferred as specified by the workshop scope.
