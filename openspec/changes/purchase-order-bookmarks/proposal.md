# Proposal

## Why

Users need a quick way to mark purchase orders for later reference. The current MVP has PO list and detail views but no bookmark behavior; a shared, persisted PO bookmark keeps the feature useful across page reloads and browsers without introducing accounts.

## What Changes

- Add shared bookmark state for purchase orders, with an action to bookmark or remove a bookmark.
- Show bookmark state in the PO list and detail views, and allow users to filter the list to bookmarked POs.
- Persist bookmark state in PostgreSQL and expose it through the PO API.
- Add focused backend, frontend, and end-to-end coverage for toggling, persistence, and filtering.
- Keep the feature limited to purchase orders; PR and GR bookmarks, authentication, and per-user bookmark state are out of scope.

## Capabilities

### New Capabilities

- `purchase-order-bookmarks`: Mark and unmark purchase orders in shared persistent state and find bookmarked orders from the PO list.

### Modified Capabilities

None.

## Impact

- Backend: purchase-order routes and service, plus a database migration for bookmark persistence.
- API: PO bookmark mutation and retrieval/list filtering behavior.
- Frontend: PO list and detail pages and the API client.
- Tests: focused Jest, frontend, and Playwright coverage; no new dependency expected.
