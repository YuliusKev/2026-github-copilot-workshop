## Context

The baseline repo already implements PR (prebuilt) and PO (workshop backlog, complete) modules with a consistent pattern: thin Fastify routes delegate to a service module that does mapping, validation, and transactional SQL against `pg` via `fastify.db`. The DB schema for GR (`goods_receipts`, `gr_lines`) already exists in `db/migrations/001_init_procurement_mvp.sql` and is untouched. GR was explicitly left out of the workshop backlog (see `docs/plan.md` and `.github/copilot-instructions.md`), so no backend/frontend GR code exists yet — this change fills that gap using the same conventions established by the PO module (`purchase-order-service.js`, `purchase-order-routes.js`, `POCreatePage.vue` + `POLineAllocationTable.vue`).

## Goals / Non-Goals

**Goals:**
- Implement the three GR endpoints from `docs/plan.md`: `POST /api/goods-receipts`, `POST /api/goods-receipts/:id/post`, `GET /api/goods-receipts/:id`.
- Enforce the GR data-model rule already documented in `docs/plan.md` §5.3: GR received qty <= PO line open qty (`qty_ordered - qty_received`), applied per PO line across all its GR lines.
- On posting a GR, atomically update `po_lines.qty_received` and roll the increment up to `pr_lines.qty_received` through the `pr_line_allocations` bridge (proportionally distributed across the PR lines allocated to that PO line, mirroring how PO creation already distributes allocated qty).
- Add GR List/Create/Detail pages wired to real APIs, following the PO module's page/component structure and the baseline's CSS/status-badge conventions.
- Keep GR creation scoped to lines of a single `SUBMITTED` PO with `qtyOpenForGr > 0` (already exposed by the existing `GET /api/purchase-orders/:id/open-lines`).

**Non-Goals:**
- No new DB migration — schema is already final.
- No partial/multi-PO GR (one GR always references exactly one PO, per schema FK).
- No inventory/stock module, no notifications, no reporting.
- No changes to PR or PO endpoint contracts or status machines.
- No GR editing after creation besides the single DRAFT -> POSTED transition (no line edits, no cancel/void).

## Decisions

1. **GR line receipt validation happens in the service layer, mirroring PO's over-allocation guard.**
   - Alternative considered: DB CHECK constraint / trigger. Rejected because the open-qty check spans two tables (`po_lines.qty_ordered` vs SUM of `gr_lines.qty_received` across GRs) and the codebase's existing convention (PO module) does this kind of cross-row validation in application code inside a transaction with `FOR UPDATE` row locks, not DB triggers. Keeps GR consistent with PO for workshop readability.

2. **`po_lines.qty_received` roll-up happens at POST time (not at GR create/DRAFT time).**
   - Matches the schema comment in `docs/plan.md`: "On GR posting, atomically UPDATE po_lines SET qty_received...". A DRAFT GR reserves nothing; only posting commits the receipt. This avoids needing a separate "reserved qty" column that doesn't exist in the schema.

3. **PR line qty_received roll-up is proportional across allocations when a PO line has multiple PR-line allocations.**
   - `pr_line_allocations` allows one PO line to be funded by multiple PR lines (bridge table). When a GR posts qty X against a PO line, distribute X to each allocation's PR line proportionally to `allocated_qty / total_allocated_qty` for that PO line, capped by remaining request qty. Alternative considered: apply full receipt to the first allocation only — rejected as it would misrepresent PR-level fulfillment when a PO line is split-funded, which the schema explicitly supports.
   - Edge case: rounding of proportional splits is handled by applying rounded amounts to all-but-last allocation and giving the last allocation the remainder, so the sum always equals exactly X.

4. **GR number generation follows the same pattern as PO number generation** (`GR-2026-0001`, incrementing count of existing `goods_receipts` rows), for consistency with `createPoNumber` in `purchase-order-service.js`.

5. **Frontend structure mirrors the PO module 1:1**: `GRListPage.vue` (table + status badges), `GRCreatePage.vue` (PO picker + line quantity table), `GRDetailPage.vue` (header + lines + Post button), plus a reusable `GRLineReceiptTable.vue` component analogous to `POLineAllocationTable.vue`. This keeps the codebase teachable and consistent, per the workshop-first principle in `.github/copilot-instructions.md`.

6. **GR creation requires PO status `SUBMITTED`** (not `DRAFT`), consistent with the plan's flow diagram (PO must be submitted before goods can be received against it).

## Risks / Trade-offs

- [Risk] Concurrent GR postings against the same PO line could race past the open-qty check → Mitigation: use `SELECT ... FOR UPDATE` on the relevant `po_lines` rows inside a DB transaction when creating and when posting a GR, same pattern as `createPurchaseOrder`'s PR-line locking.
- [Risk] Proportional PR-line roll-up adds complexity not explicitly spelled out in `docs/plan.md` → Mitigation: keep the distribution logic in one small, well-named service function (`distributeReceiptAcrossAllocations`) with a focused Jest test covering the split-allocation case.
- [Risk] Workshop scope says GR is "left for further exploration" — implementing it now means diverging from the original backlog sequencing → Mitigation: this is an explicit user-requested change (openspec change), not a workshop deviation; existing PR/PO scope and tests remain untouched.
- [Risk] Frontend GR pages need a PO picker limited to SUBMITTED POs with open lines; no existing endpoint filters POs by status → Mitigation: reuse `GET /api/purchase-orders` (list all) and filter client-side by `status === 'SUBMITTED'`, same pattern `POHeaderForm.vue` uses to filter `APPROVED` PRs client-side.
