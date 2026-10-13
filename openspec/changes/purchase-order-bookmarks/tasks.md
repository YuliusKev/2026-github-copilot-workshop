# Tasks

## 1. Persistence and API

- [x] 1.1 Add an idempotent migration for the shared PO bookmark flag, apply it from the Docker initialization script, and document the one-time command for existing database volumes; verify fresh initialization and repeated migration application succeed.
- [x] 1.2 Add bookmark state to PO list/detail responses, bookmarked-only filtering, and idempotent POST/DELETE bookmark routes; add focused backend tests for add/remove, missing POs, and filtering, and verify with `rtk npm --prefix backend test -- --runInBand tests/services/purchase-order-service.test.js` plus any new route tests.
- [x] 1.3 Update the API and workshop documentation for the bookmark field, endpoints, shared semantics, and optional PO-only scope; verify the documented contract matches the implemented routes and list query.

## 2. Purchase Order Views

- [x] 2.1 Add bookmark actions to the PO list and detail views and a bookmarked-only list filter; cover successful updates, loading/error behavior, and empty results in frontend tests, then verify with `rtk npm --prefix frontend test`.

## 3. End-to-End Verification

- [x] 3.1 Add a Playwright flow that bookmarks a PO, observes the state on list and detail views, filters to bookmarks, and removes the bookmark; verify with `rtk npm run test:e2e -- tests/e2e/po-bookmarks.spec.js --workers=1` against the running API, frontend, and PostgreSQL.
