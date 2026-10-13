# Design

## Context

The baseline migration already defines `goods_receipts` and `gr_lines`, and PO lines expose `qty_ordered`, `qty_received`, and open quantity. PO creation currently creates one PR allocation for each PO line. There is no GR route, service, API client support, page, or route registration. See `proposal.md` for motivation and `specs/goods-receipts/spec.md` for required behavior.

## Goals / Non-Goals

**Goals:**

- Complete the receipt flow using the existing schema and service conventions.
- Keep posted quantities consistent across receipt, PO line, and linked PR line records.
- Add a clear path from a submitted PO to receipt creation and inspection.

**Non-Goals:**

- Inventory valuation, stock management, invoice matching, supplier returns, or editing/deleting posted receipts.
- Changing the existing PR/PO workflow or adding new business entities.

## Decisions

- **Use the existing receipt tables without a migration.** The baseline schema has the required header, line, status, and received-quantity fields. Add a migration only if implementation uncovers a concrete schema gap.
- **Add a list API and pages for list, create, and detail.** The documented endpoint set lacks a collection endpoint despite the planned GR list and navigation. `GET /api/goods-receipts` returns summaries; receipt creation accepts `poId`, optional receipt date/notes, and lines containing `poLineId`, `qtyReceived`, and `actualSiteCode`.
- **Create drafts without reserving PO quantities.** Validate line membership and current open quantity when creating, but do not change counters until posting. This avoids treating an editable draft as a committed receipt; posting must re-check quantities because other receipts may have posted in the meantime.
- **Post in one database transaction.** Lock the draft receipt and its PO lines in a stable order, verify the PO is submitted and every aggregate receipt-line quantity still fits, then set the receipt to POSTED and update `po_lines.qty_received` and linked `pr_lines.qty_received`. Roll back all writes on any failure. Use the current PO creator's one-PR-allocation-per-PO-line invariant for the PR counter update.
- **Use thin Fastify routes and a focused service.** Keep payload/business validation and transaction handling in the service; routes map not-found and validation errors to the existing JSON error shape. Follow existing component and navigation patterns in Vue.
- **Generate GR numbers consistently with the existing PO convention.** Use the `GR-2026-####` format and serialize number allocation inside the creation transaction so concurrent creates cannot choose the same count-derived number. A database sequence is an alternative, but would require schema changes for this workshop-sized feature.

## Risks / Trade-offs

- [Drafts do not reserve quantities] Multiple drafts can be created against the same open quantity; a later post can fail if another receipt posts first. The UI must show the posting error and preserve the draft for correction.
- [Counter drift or partial updates] Updating receipt status and both denormalized counters separately could leave inconsistent data. Perform all posting writes in one transaction and test rollback behavior.
- [Allocation shape could broaden] The current PO creator creates one allocation per PO line. If future workflows allow multiple PR allocations per PO line, PR received-quantity distribution needs an explicit rule before changing that invariant.
- [Workshop scope changes] Existing instructions and `docs/plan.md` describe GR as out of scope. Update the relevant scope and API documentation with this feature so they no longer contradict the planned implementation.

## Migration Plan

No database migration is expected because the receipt tables and quantity counters are already part of the baseline schema. Deploy the backend endpoints and frontend together. Rolling back the application leaves receipt records in the existing schema; do not remove or reset posted data.
