# PO MVP Implementation Runbook

This runbook sequences the participant backlog against the existing baseline. The database schema, dashboard, PR flow, and PO backend are already present. The main missing deliverables are PO frontend pages and end-to-end coverage.

## Scope

Included: PO list/create/detail UI, the required PO APIs, PO allocation and status validation, focused Jest/API tests, one PO Playwright journey, and the small PR-detail entry point needed to start PO creation.

Excluded: GR endpoints, pages, rules, migrations, and test flows; broad PR redesign; enterprise workflow features. Treat GR as future exploration only.

## Ordered Checklist

### 1. Verify the baseline

- [ ] Inspect and run the existing PO service tests.
- [ ] Start PostgreSQL and verify the seeded approved PR and its open-line quantities are available.
- [ ] Confirm the current PO routes and service behavior before making changes.

**Checkpoint:** Existing PO tests pass, and approved seed data provides at least one PR line with remaining quantity. Do not change code unless this gate exposes a blocker.

### 2. Harden PO creation rules

- [ ] Prevent repeated entries for the same PR line from collectively exceeding its remaining quantity. Reject duplicates or aggregate them before validation.
- [ ] Reject non-finite or malformed allocation quantities and unit prices.
- [ ] Derive or validate PO item identity against the approved PR line instead of trusting inconsistent client-supplied values.
- [ ] Preserve the existing transaction and row-lock allocation check.
- [ ] Add focused tests for duplicate-line over-allocation, malformed values, unapproved PRs, successful allocation, and rollback after failure.

**Checkpoint:** Focused service tests prove allocations cannot exceed remaining PR quantities and failed creation leaves allocations unchanged.

### 3. Verify the HTTP contract

- [ ] Add route-level tests for PO create, submit, detail, open-lines, and list endpoints.
- [ ] Check success response shapes and status codes.
- [ ] Check invalid input, missing records, and invalid status transitions map to clear error responses.

**Checkpoint:** Route tests pass and the PO endpoints remain compatible with the API contract in `docs/plan.md`.

### 4. Build the PO frontend workflow

- [ ] Add PO API wrappers in `frontend/src/api.js`.
- [ ] Implement PO list, create, and detail pages.
- [ ] Register PO routes and navigation.
- [ ] In PO creation, select an approved PR, load its open lines, accept vendor and per-line allocation quantities, create the PO, and navigate to its detail.
- [ ] On PO detail, allow submitting a draft PO.
- [ ] Handle loading, empty, and API-error states.
- [ ] Keep GR actions and receipt behavior out of the UI.

**Checkpoint:** The frontend build passes and all PO pages handle their expected states.

### 5. Connect PR detail to PO creation

- [ ] Add a create-PO action to PR detail only when the PR is `APPROVED` and has open quantity.
- [ ] Link to PO creation with that PR selected and its open lines loaded.
- [ ] Preserve the existing PR flow; avoid unrelated PR changes.

**Checkpoint:** The action is absent for non-approved or fully allocated PRs, and eligible PR lines populate correctly.

### 6. Verify the user journey

- [ ] Add one Playwright flow using the seeded approved PR: open PR, create PO, submit PO, and inspect PO detail.
- [ ] Assert PO status and allocated quantities.
- [ ] Keep the flow PO-focused; do not add a GR step.

**Checkpoint:** The E2E journey passes with PostgreSQL and the app running.

### 7. Align documentation and acceptance

- [ ] Clarify in `docs/plan.md` which features are baseline, participant PO backlog, and future GR exploration.
- [ ] Label full procurement-flow diagrams and page summaries as conceptual/future scope where needed.
- [ ] Align the workshop agenda and done criteria with the PO-only implementation boundary.

**Checkpoint:** Documentation consistently defines PO as the participant implementation backlog, and all acceptance items have passing checks.

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
