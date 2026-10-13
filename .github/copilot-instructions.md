# Copilot Instructions for This Workshop

## Objective

Build a procurement management system with core modules for Purchase Requisition (PR), Purchase Order (PO), and Goods Receipt (GR).
A procurement system manages how a company buys things, with control and traceability from request to receiving.

The modules for a MVP (minimum viable product) procurement system include:

- **Purchase Requisition (PR)**: Employees request items/services, which are reviewed and approved by managers.
- **Purchase Order (PO)**: Approved requisitions are converted into purchase orders sent to suppliers, tracking order details and status.
- **Goods Receipt (GR)**: When items are delivered, a goods receipt is created to confirm what was received, update inventory, and trigger payment.

In this workshop, we focus on using a prebuilt baseline and add a backlog sprint.

Reference plan: `docs/plan.md`.

## Scope Constraints

- Baseline provided in repo: database schema + Home/Dashboard + PR module (list/create/detail + required PR APIs).
- Participant implementation scope: PO module (PO list/create/detail + PO APIs + PO validations) and the approved GR module extension (GR list/create/detail + GR APIs + receipt validations).
- Preserve the prebuilt PR flow while completing the PO-to-GR flow.
- Keep business scope minimal and teachable.
- Avoid enterprise-only features (SSO, workflow engine, reporting, notifications, advanced compliance).
- Prefer clarity and small modules over abstraction-heavy architecture.

## Technology Decisions (Do Not Change)

- Backend: Fastify + JavaScript
- API style: REST JSON
- Database: PostgreSQL (Docker local)
- Frontend: Vue 3 + Vite + JavaScript
- Unit test: Jest
- E2E test: Playwright
- Do not use Prisma.

## API Requirements

- Maintain compatibility with endpoints listed in `docs/plan.md`.
- For participant backlog, prioritize PO endpoints:
  - `POST /api/purchase-orders`
  - `POST /api/purchase-orders/:id/submit`
  - `GET /api/purchase-orders/:id`
  - `GET /api/purchase-orders/:id/open-lines`
- Enforce PO rule: allocation qty <= PR line remaining qty.
- Implement GR endpoints listed in `docs/plan.md`.
- Enforce GR rule: receipt qty <= PO line open qty, allow partial receipts, and accumulate posted received quantities.
- Posting transitions a receipt from `DRAFT` to `POSTED` and updates PO/linked PR quantities atomically.

## Code Style Guidance

- Keep files short and readable for workshop participants.
- Use explicit naming; avoid clever patterns.
- Include basic request validation and clear error responses.
- Favor service functions for business rules and thin route handlers.

## Implementation Checklist

- [ ] Keep changes within the PO and GR backlog; preserve the baseline PR flow.
- [ ] Validate inputs and enforce PO/GR business rules in service functions; return clear errors.
- [ ] Add focused tests for success paths, invalid transitions, over-allocation, and over-receipt.
- [ ] Run the relevant Jest and Playwright tests, and report any checks not run.
- [ ] Update documentation when behavior, API contracts, setup, or scope changes; keep `docs/plan.md` consistent with the implemented API.

## Testing Expectations

- Add focused Jest tests for PO and GR business validations (especially over-allocation, over-receipt, and status transitions).
- Add Playwright coverage for PO and GR flows integrated with baseline PR data.
- Do not over-invest in test framework complexity.

## User Interface Guidelines

- Follow the existing UI patterns established in the baseline for consistency.
- Always respect the CSS variables set in the baseline for colors, spacing, and typography.
- Never use emojis in the UI or commit messages. Create a custom SVG icon if needed for visual emphasis.

## Optional Extension

- Bookmark feature (PR|PO|GR) is an optional post-backlog exercise and should be driven via GitHub Issue creation workflow.

## Workshop-First Principle

When there is a trade-off between production robustness and workshop clarity, choose workshop clarity.

# RTK — Token-Optimized CLI

**rtk** is a CLI proxy that filters and compresses command outputs, saving 60-90% tokens.

## Rule

Always prefix shell commands with `rtk`:

```bash
# Instead of:              Use:
git status                 rtk git status
git log -10                rtk git log -10
cargo test                 rtk cargo test
docker ps                  rtk docker ps
kubectl get pods           rtk kubectl pods
```

## Meta commands (use directly)

```bash
rtk gain              # Token savings dashboard
rtk gain --history    # Per-command savings history
rtk discover          # Find missed rtk opportunities
rtk proxy <cmd>       # Run raw (no filtering) but track usage
```
