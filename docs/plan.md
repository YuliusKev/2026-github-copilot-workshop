# Copilot Workshop Plan: Procurement MVP (minimum viable product)

## 1) Goal

Build a realistic but small procurement web app to practice using Copilot across SDLC phases.

MVP flow:

1. Purchase Requisition (PR) create + submit + approve
2. Purchase Order (PO) create from approved PR lines + submit
3. Goods Receipt (GR) create from PO lines + post
4. PR detail shows linked PO/GR and quantities

Out of scope: production hardening, SSO, advanced approval matrix, reporting, notifications, and full enterprise compliance controls.

Workshop implementation strategy:

1. Core schema migration + sample seed are pre-provided in repository and bootstrapped via Docker init for participants.
2. Home/Dashboard + PR module (list/create/detail + PR APIs) are prebuilt and working.
3. Participant backlog focus is PO module only (PO list/create/detail + PO APIs + PO validations).
4. GR module is not implemented during workshop and is left for further exploration.
5. Bookmark feature is post-backlog and practiced via GitHub Issue-driven development.
6. DB bootstrap is prepared for Windows/macOS/Linux hosts by using POSIX `sh` init script + LF normalization for `.sh` and `.sql` files.

DB bootstrap command (participant-ready):

```bash
docker compose down -v
docker compose up -d db
```

Bootstrap SQL files:

- `db/migrations/001_init_procurement_mvp.sql`
- `db/seeds/002_seed_procurement_mvp.sql`

Bootstrap entrypoint script:

- `docker/postgres/init/00-init-mvp-db.sh`

---

## 2) Final Tech Stack

- Backend: Fastify (JavaScript), REST API
- Database: PostgreSQL in Docker (`postgres:16-alpine`)
- Frontend: Vue 3 + Vite (JavaScript)
- Unit test: Jest
- E2E/UI test: Playwright

Why this works for workshop:

- Fastify is lightweight and easy to scaffold with Copilot
- REST keeps backend/frontend contract simple
- PostgreSQL in Docker is stable and realistic for local teams
- Vue + Vite has very fast startup for participants
- Jest + Playwright demonstrates both API/unit and end-to-end testing

---

## 3) Architecture

```mermaid
flowchart LR
    U[Participant Browser] --> V[Vue App]
    V -->|HTTP REST| B[Fastify API]
    B --> D[(PostgreSQL Docker)]
```

```mermaid
flowchart LR
    PR[PR: DRAFT -> SUBMITTED -> APPROVED] --> PO[PO: DRAFT -> SUBMITTED]
    PO --> GR[GR: DRAFT -> POSTED]
    GR --> VIEW[PR Detail Tracking]
```

## 3.1) Web App Pages and Navigation

Use this as the mental model of what we are building in the frontend.

```mermaid
flowchart TD
  HOME[Home / Dashboard]
  PRL[PR List Page]
  POL[PO List Page]
  GRL[GR List Page]
  PRC[PR Create Page]
  PRD[PR Detail Page]
  POC[PO Create Page]
  POD[PO Detail Page]
  GRC[GR Create Page]
  GRD[GR Detail Page]

  HOME --> PRL
  HOME --> POL
  HOME --> GRL

  PRL --> PRC
  PRL --> PRD
  POL --> POC
  POL --> POD
  GRL --> GRC
  GRL --> GRD

  PRC --> PRD
  PRD --> POC
  POC --> POD
  POD --> GRC
  GRC --> GRD
  GRD --> PRD
```

```mermaid
flowchart LR
  A[1. User creates PR] --> B[2. Submit + Approve PR]
  B --> C[3. Create PO from PR open lines]
  C --> D[4. Submit PO]
  D --> E[5. Create GR from PO open lines]
  E --> F[6. Post GR]
  F --> G[7. Open PR Detail to see linked PO/GR and quantities]
```

Page purpose summary:

- `PR Create`: enter requisition header + line items
- `PR Detail`: show PR status, lines, and fulfillment summary
- `PO Create`: pick approved PR lines and allocate order quantities
- `PO Detail`: review PO status and open quantities
- `GR Create`: receive items against PO lines
- `GR Detail`: confirm posted receipt details

---

## 4) API Scope (REST)

Target system APIs (full procurement flow):

### Requisition

- `POST /api/requisitions`
- `POST /api/requisitions/:id/submit`
- `POST /api/requisitions/:id/approve`
- `GET /api/requisitions/:id`
- `GET /api/requisitions/:id/open-lines`

Workshop status: prebuilt in baseline.

### Purchase Order

- `GET /api/purchase-orders`
- `POST /api/purchase-orders`
- `POST /api/purchase-orders/:id/submit`
- `GET /api/purchase-orders/:id`
- `GET /api/purchase-orders/:id/open-lines`

Workshop status: participant implementation backlog (primary focus).

The PO list page uses `GET /api/purchase-orders`; the detail page uses `GET /api/purchase-orders/:id` and submits draft orders through `POST /api/purchase-orders/:id/submit`.

Create PO integration:

- `/purchase-orders/new` preserves the generated header and allocation components and loads open lines from approved requisitions via `GET /api/requisitions` and `GET /api/requisitions/:id/open-lines`.
- Save As Draft calls `POST /api/purchase-orders`; Submit PO creates a draft if needed, then calls `POST /api/purchase-orders/:id/submit`. A saved draft is reused on submission retries, and its fields are locked because no PO update endpoint exists.
- The payload maps vendor to `vendorName`, selected PR IDs to `prLineId`, order quantity to `qtyOrdered`, delivery address to `siteCode`, and delivery date (or header Needed By date) to `requiredDate`. Delivery address defaults to the source PR site code.
- Currency, payment terms, and notes remain in the generated UI but are not persisted by the current MVP schema/API.
- Allocation must be positive and no greater than PR remaining quantity. The service locks PR rows and checks cumulative quantities when the same PR line appears more than once. Rule violations return HTTP `422` with `{ "message": "..." }`; the page displays those messages, including stale-allocation failures.
- Focused checks: `rtk npm --prefix backend test -- --runInBand tests/services/purchase-order-service.test.js`, `rtk npm --prefix frontend test`, and `rtk npm run test:e2e -- tests/e2e/purchase-order-create.spec.js --workers=1`.
- Playwright requires the API, frontend, and PostgreSQL to be running. It creates dedicated PR/PO test records through the baseline PR APIs without modifying existing requisitions. Test records remain in the local database.

### Goods Receipt

- `POST /api/goods-receipts`
- `POST /api/goods-receipts/:id/post`
- `GET /api/goods-receipts/:id`

Workshop status: out of implementation scope (further exploration).

---

## 5) Data Model (MVP)

The model is intentionally small and only supports PR -> PO -> GR flow.
All primary keys are UUID. Schema source of truth: `db/migrations/001_init_procurement_mvp.sql`.

### 5.1) Core Tables

1. `purchase_requisitions` (PR header)

- `id` UUID (PK)
- `pr_number` VARCHAR(30) (UNIQUE)
- `requester_name` VARCHAR(120)
- `department_name` VARCHAR(120)
- `title` VARCHAR(255)
- `notes` TEXT (nullable)
- `needed_by_date` DATE
- `status` (`DRAFT | SUBMITTED | APPROVED`)
- `created_at`, `updated_at`

2. `pr_lines` (PR item lines)

- `id` UUID (PK)
- `pr_id` UUID (FK -> `purchase_requisitions.id`)
- `line_no` INT
- `item_code` VARCHAR(60), `item_name` VARCHAR(255)
- `qty_requested` NUMERIC(14,2) (> 0)
- `qty_allocated` NUMERIC(14,2) (>= 0, default 0) — denormalized, updated on PO creation
- `qty_received` NUMERIC(14,2) (>= 0, default 0) — denormalized, updated on GR posting
- `uom` VARCHAR(20)
- `est_unit_price` NUMERIC(14,2) (>= 0)
- `site_code` VARCHAR(50)
- `required_date` DATE
- `budget_center` VARCHAR(60)
- `created_at`, `updated_at`
- UNIQUE(`pr_id`, `line_no`)

3. `purchase_orders` (PO header)

- `id` UUID (PK)
- `po_number` VARCHAR(30) (UNIQUE)
- `vendor_name` VARCHAR(255)
- `status` (`DRAFT | SUBMITTED`)
- `created_at`, `updated_at`

4. `po_lines` (PO item lines)

- `id` UUID (PK)
- `po_id` UUID (FK -> `purchase_orders.id`)
- `line_no` INT
- `item_code` VARCHAR(60), `item_name` VARCHAR(255)
- `qty_ordered` NUMERIC(14,2) (> 0)
- `qty_received` NUMERIC(14,2) (>= 0, default 0) — denormalized, updated on GR posting
- `uom` VARCHAR(20)
- `unit_price` NUMERIC(14,2) (>= 0)
- `site_code` VARCHAR(50)
- `required_date` DATE
- `created_at`, `updated_at`
- UNIQUE(`po_id`, `line_no`)

5. `pr_line_allocations` (bridge PR line -> PO line)

- `id` UUID (PK)
- `pr_line_id` UUID (FK -> `pr_lines.id`)
- `po_line_id` UUID (FK -> `po_lines.id`)
- `allocated_qty` NUMERIC(14,2) (> 0)
- `created_at`
- UNIQUE(`pr_line_id`, `po_line_id`)

6. `goods_receipts` (GR header)

- `id` UUID (PK)
- `gr_number` VARCHAR(30) (UNIQUE)
- `po_id` UUID (FK -> `purchase_orders.id`)
- `status` (`DRAFT | POSTED`)
- `receipt_date` DATE
- `notes` TEXT (nullable)
- `created_at`, `updated_at`

7. `gr_lines` (GR item lines)

- `id` UUID (PK)
- `gr_id` UUID (FK -> `goods_receipts.id`)
- `po_line_id` UUID (FK -> `po_lines.id`)
- `line_no` INT
- `qty_received` NUMERIC(14,2) (> 0)
- `actual_site_code` VARCHAR(50)
- `created_at`
- UNIQUE(`gr_id`, `line_no`)

### 5.2) ERD (MVP)

```mermaid
erDiagram
   purchase_requisitions ||--|{ pr_lines : has
   purchase_orders ||--|{ po_lines : has
   pr_lines ||--o{ pr_line_allocations : allocated_to
   po_lines ||--o{ pr_line_allocations : receives_allocation
   purchase_orders ||--o{ goods_receipts : has
   goods_receipts ||--|{ gr_lines : has
   po_lines ||--o{ gr_lines : received_by

   purchase_requisitions {
    uuid id PK
    string pr_number UK
    string requester_name
    string department_name
    string title
    date needed_by_date
    string notes
    string status
    timestamp created_at
    timestamp updated_at
   }

   pr_lines {
    uuid id PK
    uuid pr_id FK
    int line_no
    string item_code
    string item_name
    numeric qty_requested
    numeric qty_allocated
    numeric qty_received
    string uom
    numeric est_unit_price
    string site_code
    date required_date
    string budget_center
    timestamp created_at
    timestamp updated_at
   }

   purchase_orders {
    uuid id PK
    string po_number UK
    string vendor_name
    string status
    timestamp created_at
    timestamp updated_at
   }

   po_lines {
    uuid id PK
    uuid po_id FK
    int line_no
    string item_code
    string item_name
    numeric qty_ordered
    numeric qty_received
    string uom
    numeric unit_price
    string site_code
    date required_date
    timestamp created_at
    timestamp updated_at
   }

   pr_line_allocations {
    uuid id PK
    uuid pr_line_id FK
    uuid po_line_id FK
    numeric allocated_qty
    timestamp created_at
   }

   goods_receipts {
    uuid id PK
    string gr_number UK
    uuid po_id FK
    string status
    date receipt_date
    string notes
    timestamp created_at
    timestamp updated_at
   }

   gr_lines {
    uuid id PK
    uuid gr_id FK
    uuid po_line_id FK
    int line_no
    numeric qty_received
    string actual_site_code
    timestamp created_at
   }
```

### 5.3) Rule Mapping to Data Model

1. PO allocated qty <= PR line remaining qty

- Check: `pr_lines.qty_allocated` + new allocation <= `pr_lines.qty_requested`
- On PO creation, atomically UPDATE `pr_lines SET qty_allocated = qty_allocated + allocated_qty`
- Bridge record: `pr_line_allocations.allocated_qty`

2. GR received qty <= PO line open qty

- Check: `po_lines.qty_received` + new receipt <= `po_lines.qty_ordered`
- On GR posting, atomically UPDATE `po_lines SET qty_received = qty_received + qty_received`
- Also UPDATE `pr_lines.qty_received` via allocation chain

3. Status transitions follow workshop flow only

- PR: `DRAFT -> SUBMITTED -> APPROVED`
- PO: `DRAFT -> SUBMITTED`
- GR: `DRAFT -> POSTED`

---

## 6) Workshop Agenda (5 Hours)

### Hour 1 — Setup + Baseline Boot

- Clone repo, start PostgreSQL via Docker Compose
- Apply pre-provided core migration script
- Configure backend/frontend `.env` and run baseline app
- Verify Home/Dashboard + PR module are already working

### Hour 2 — PO Backlog: API + Data Rules

- Implement PO create/submit/detail/open-lines endpoints
- Implement allocation validation (allocated qty <= PR remaining qty)
- Keep handlers thin and move rules to PO service

### Hour 3 — PO Backlog: UI Pages

- Build PO list/create/detail pages on top of baseline navigation
- Connect pages to PO APIs
- Validate create-from-approved-PR-line flow

### Hour 4 — PO-focused Testing + GitHub Review

- Add Jest tests focused on PO rules and status transitions
- Add Playwright flow for PO pages integrated with baseline PR data
- Open PR and use Copilot review + code quality checks

### Hour 5 — Optional Extension + Exploration

- Implement Bookmark feature from GitHub Issue (optional, post-backlog)
- Demo completed PO backlog
- GR module left as self-paced exploration using this plan

---

## 7) Testing Strategy

- Jest for service-level and route validation tests
- Playwright for PO-focused end-to-end journey on top of baseline PR

Suggested minimum:

1. Jest: reject over-allocation
2. Jest: reject invalid PO status transition
3. Playwright: PR baseline data -> PO create -> PO submit -> PO detail assertions

---

## 8) Local Run Baseline

### Docker

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: procurement_mvp
      POSTGRES_USER: workshop
      POSTGRES_PASSWORD: workshop
    ports:
      - "5433:5432"
```

### Backend env

```env
PORT=3000
DATABASE_URL=postgres://workshop:workshop@localhost:5433/procurement_mvp
```

### Frontend env

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 9) Copilot Usage by SDLC Phase

1. Requirements: turn broad business asks into strict MVP boundaries
2. Design: generate schema and endpoint skeletons
3. Build: scaffold handlers/services/components
4. Test: generate Jest and Playwright cases
5. Refactor: improve naming, validation, and error handling

---

## 10) Done Criteria

- App runs locally with Docker PostgreSQL + Fastify + Vue
- Baseline Home/Dashboard + PR pages/APIs run without modification
- PO backlog is implemented (PO list/create/detail + required PO endpoints)
- PO quantity validations are enforced
- Jest and Playwright each run at least one PO-focused meaningful test
- Bookmark feature is captured as a GitHub Issue (or implemented if time allows)
