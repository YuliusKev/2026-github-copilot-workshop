# Design

## Context

The PO list and detail views already use `GET /api/purchase-orders` and `GET /api/purchase-orders/:id`. The PostgreSQL bootstrap runs `001_init_procurement_mvp.sql` directly through a shell script and does not discover later migrations. The application has no user identity, so bookmark state must be shared rather than associated with an individual account. See `proposal.md` and the capability spec for motivation and behavior.

## Goals / Non-Goals

**Goals:**

- Persist one bookmark flag per PO and expose that state through existing PO reads.
- Support bookmark actions and bookmarked-only filtering without changing existing unfiltered PO behavior.
- Keep the API and UI changes small and consistent with the current PO service and pages.

**Non-Goals:**

- User-specific bookmarks, account/authentication support, or bookmark behavior for PRs and GRs.
- A general-purpose favorites framework or a separate bookmark-management page.

## Decisions

- Add `is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE` to `purchase_orders` in a new idempotent SQL migration. A column fits the single shared state and avoids a join table with no owner key. A separate relation would be appropriate if the app later gains per-user bookmarks.
- Add `POST /api/purchase-orders/:id/bookmark` to set the flag to true and `DELETE /api/purchase-orders/:id/bookmark` to set it to false. Both operations are idempotent; return the updated bookmark state and return 404 when the PO does not exist.
- Include `isBookmarked` in each PO list item and PO detail response. Accept `?bookmarked=true` on the existing list endpoint to filter, leaving the default list unchanged.
- Place bookmark actions on the existing PO list and detail views, and add a bookmarked-only filter to the list. Use the current API client and page loading/error patterns.
- Update `docker/postgres/init/00-init-mvp-db.sh` to apply the new migration after the baseline schema and before seeding. This keeps fresh Docker databases current. Existing persistent volumes need the new SQL migration applied once because PostgreSQL init scripts only run when the data directory is initialized.

Alternatives considered: browser storage would not share state across browsers and would bypass the existing API; a join table would imply an owner model the app does not have. A toggle endpoint was avoided in favor of explicit set/remove operations so retries do not invert the state.

## Risks / Trade-offs

- Shared state means one user's action affects every viewer → Make the shared scope explicit in the feature contract and UI behavior; introduce ownership only alongside identity support.
- Existing local databases may not run the Docker init script again → Document the one-time migration step for persistent volumes and keep the migration idempotent.
- Filtering and the new field could accidentally change existing list behavior → Preserve the unfiltered query semantics and add focused coverage for both filtered and unfiltered requests.

## Migration Plan

1. Add the idempotent migration and have fresh database initialization apply it after `001_init_procurement_mvp.sql`.
2. For an existing local volume, apply the new migration once before starting the updated API; the default false value preserves all existing POs.
3. Deploy the API and UI changes. If rolling back, revert the API/UI and leave the additive column in place; dropping it is unnecessary and would discard bookmark state.

## Open Questions

None.
