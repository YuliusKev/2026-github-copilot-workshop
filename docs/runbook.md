# PO MVP Implementation Runbook

This runbook tracks the participant backlog against the existing baseline. The database schema, dashboard, PR flow, PO backend, and PO list/create/detail pages are implemented. PO service and frontend tests pass, and the PO module Playwright happy and over-allocation paths pass. Remaining work is listed unchecked below.

## Scope

Included: PO list/create/detail UI, the required PO APIs, PO allocation and status validation, focused service/frontend tests, and PO Playwright coverage. A PR-detail shortcut into PO creation remains a possible workflow follow-up.

Excluded: GR endpoints, pages, rules, migrations, and test flows; broad PR redesign; enterprise workflow features. Treat GR as future exploration only.

## Existing Database Volumes

The PO bookmark migration runs automatically when Docker initializes a fresh database. For an existing volume, start the database and apply the migration once; the SQL is safe to repeat:

```bash
rtk docker compose exec -T db psql -v ON_ERROR_STOP=1 -U workshop -d procurement_mvp -f /workspace/db/migrations/002_purchase_order_bookmarks.sql
```

## Ordered Checklist

### 1. Verify the baseline

- [x] Inspect and run the existing PO service tests.
- [x] Start PostgreSQL and verify approved PR test data and open-line quantities are available.
- [x] Confirm the current PO routes and service behavior before making changes.

**Checkpoint:** Existing PO tests pass, and approved PR test data provides lines with remaining quantity.

### 2. Harden PO creation rules

- [x] Prevent repeated entries for the same PR line from collectively exceeding its remaining quantity.
- [x] Reject non-finite or malformed allocation quantities and unit prices.
- [ ] Derive or validate PO item identity against the approved PR line instead of trusting inconsistent client-supplied values.
- [x] Preserve the existing transaction and row-lock allocation check.
- [x] Add focused service tests for duplicate-line over-allocation, malformed values, unapproved PRs, successful allocation, and rollback after failure.

**Checkpoint:** Focused service tests prove allocations cannot exceed remaining PR quantities and failed creation leaves allocations unchanged. PO item identity consistency remains open above.

### 3. Verify the HTTP contract

- [ ] Add route-level tests for PO create, submit, detail, open-lines, and list endpoints.
- [ ] Check success response shapes and status codes.
- [ ] Check invalid input, missing records, and invalid status transitions map to clear error responses.

**Checkpoint:** Route tests pass and the PO endpoints remain compatible with the API contract in `docs/plan.md`.

### 4. Build the PO frontend workflow

- [x] Add PO API wrappers in `frontend/src/api.js`.
- [x] Implement PO list, create, and detail pages.
- [x] Register PO routes and navigation.
- [x] In PO creation, select an approved PR, load its open lines, accept vendor and per-line allocation quantities, and create the PO.
- [ ] Navigate directly to the new PO detail after successful creation; users currently open it from the PO list.
- [x] On PO detail, allow submitting a draft PO.
- [x] Handle loading, empty, and API-error states.
- [x] Keep GR actions and receipt behavior out of the UI.

**Checkpoint:** The frontend build passes and implemented PO pages handle their expected states.

### 5. Connect PR detail to PO creation

- [ ] Add a create-PO action to PR detail only when the PR is `APPROVED` and has open quantity.
- [ ] Link to PO creation with that PR selected and its open lines loaded.
- [ ] Preserve the existing PR flow; avoid unrelated PR changes.

**Checkpoint:** The action is absent for non-approved or fully allocated PRs, and eligible PR lines populate correctly.

### 6. Verify the user journey

- [x] Add a Playwright happy path that creates an approved PR, creates a PO, opens it from the PO list, and submits it from detail.
- [x] Add a Playwright negative path for an allocation made excessive by a competing PO.
- [x] Assert PO status and allocated quantities.
- [x] Keep the flow PO-focused; do not add a GR step.
- [ ] Add a separate journey that begins at PR detail and uses seeded PR data.

**Checkpoint:** The E2E journey passes with PostgreSQL and the app running.

### 7. Align documentation and acceptance

- [x] Clarify in `docs/plan.md` which features are baseline, participant PO backlog, and future GR exploration.
- [ ] Label full procurement-flow diagrams and page summaries as conceptual/future scope where needed.
- [ ] Align the workshop agenda and done criteria with the PO-only implementation boundary.

**Checkpoint:** Documentation consistently defines PO as the participant implementation backlog, and all acceptance items have passing checks.

## Latest Verification

- [x] `rtk npm --prefix backend test -- --runInBand tests/services/purchase-order-service.test.js`: 30 PO service tests passed.
- [x] `rtk npm test`: 35 backend tests and 15 frontend tests passed.
- [x] `rtk npm --prefix frontend run build`: production build passed.
- [x] `rtk npm run test:e2e -- tests/e2e/po-module.spec.js --workers=1`: 2 Chromium tests passed, covering PO create/list/detail/submit and stale over-allocation.
- [x] Playwright HTML report, screenshots, traces, and videos are generated in `playwright-report/` and `test-results/`.

## Verification Commands

Run from the workspace root:

```bash
rtk docker compose up -d db
rtk npm run test:backend
rtk npm run test:frontend
rtk npm run build --prefix frontend
rtk npm run test:e2e:list
rtk npm run test:e2e
```

Run Playwright with PostgreSQL and the app available. To start the app, use `rtk npm run dev` in a separate terminal. Avoid `docker compose down -v` unless intentionally resetting and deleting the local database volume.

On Windows, if the backend test script's POSIX `NODE_OPTIONS` assignment fails in PowerShell, set `NODE_OPTIONS` in the PowerShell session and invoke Jest directly from `backend`.

## Pre-push Test Hook

The tracked `.githooks/pre-push` hook runs the root `npm test` command and blocks a push when either unit-test suite fails. Enable it once in each clone:

```bash
git config core.hooksPath .githooks
```
