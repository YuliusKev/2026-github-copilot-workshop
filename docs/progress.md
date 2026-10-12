# Project Progress

**Snapshot date:** 2026-10-12

## Current State

This repository is a procurement MVP workshop project using Fastify and PostgreSQL for the backend, Vue 3 and Vite for the frontend, Jest for backend unit tests, Vitest for frontend tests, and Playwright for planned browser tests. The PostgreSQL schema and sample seed data are provided under `db/` and initialized by Docker Compose.

The baseline Purchase Requisition flow is implemented: dashboard, requisition list/create/detail pages, and requisition APIs for listing, creating, submitting, approving, reading details, and retrieving open lines.

The Purchase Order backend is implemented. It supports listing, creation from approved PR lines, submission, detail reads, and open-for-receipt line reads. Creation validates required fields and positive quantities, uses a database transaction and row locks, rejects unapproved or missing PR lines, and prevents an individual allocation from exceeding the PR line's remaining quantity. PO status transitions from `DRAFT` to `SUBMITTED` only.

The PO frontend is not integrated with the backend yet. `/purchase-orders/new` renders a prototype with hard-coded sample data and explicitly local-only actions. The API client has no PO methods, and there are no PO list or detail pages/routes. No Goods Receipt API or UI flow is implemented; GR is outside the workshop implementation scope.

## Purchase Order API

All endpoints use the `/api` prefix and are registered in the Fastify application.

| Method | Endpoint                              | Behavior                                                                                                                                                                                              |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/purchase-orders`                | Returns `{ items: [...] }` with PO headers, newest first.                                                                                                                                             |
| `POST` | `/api/purchase-orders`                | Creates a draft PO and allocations from approved PR lines; returns the PO detail with `201`. Invalid payloads, missing PR lines, unapproved PRs, and over-allocation return `422` with `{ message }`. |
| `POST` | `/api/purchase-orders/:id/submit`     | Changes a draft PO to `SUBMITTED`; returns the updated PO. Missing PO returns `404`; invalid transition returns `422`.                                                                                |
| `GET`  | `/api/purchase-orders/:id`            | Returns the PO header, lines, and their PR allocations. Missing PO returns `404`.                                                                                                                     |
| `GET`  | `/api/purchase-orders/:id/open-lines` | Returns PO lines with quantity remaining for goods receipt. Missing PO returns `404`.                                                                                                                 |

The planned API contract in `docs/plan.md` lists the four required PO endpoints; the implemented list endpoint is an additional route needed for the PO list workflow.

## Tests and Gaps

- Backend PO service tests cover payload validation, approved-PR checks, remaining-quantity checks, transactional rollback, creation, listing, open lines, and submit status transitions.
- Frontend tests cover requisition pages and the PO header/allocation components. They do not exercise an API-backed PO workflow.
- There are no route-level PO tests or Playwright E2E specs in the repository yet.
- Known PO creation hardening work: repeated payload entries for one PR line are checked independently and can collectively exceed the remaining quantity; numeric validation should also reject non-finite/malformed quantities and prices. See `docs/runbook.md` for the implementation checklist.

## Next Work

1. Harden PO allocation and numeric validation, with focused regression tests.
2. Add PO route tests for response shapes, status codes, missing records, and invalid transitions.
3. Replace the sample-only PO create page with an API-backed flow; add PO list/detail pages, API client methods, and navigation.
4. Connect approved PR detail to PO creation and add a PO-focused Playwright journey.
5. Keep GR work deferred as specified by the workshop scope.
