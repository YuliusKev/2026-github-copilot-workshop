# Application Overview: Procurement MVP

This document describes how the current application works end-to-end: architecture, page navigation, user flow, and the request/response sequence for the core Purchase Requisition (PR) → Purchase Order (PO) flow.

> For the full data model, API scope, and workshop plan, see [plan.md](./plan.md). For the latest implementation status, see [progress.md](./progress.md).

## 1. What the app does

The app is a small procurement management system covering:

- **Purchase Requisition (PR)** — an employee requests items/services (`DRAFT → SUBMITTED → APPROVED`).
- **Purchase Order (PO)** — approved PR lines are allocated into a PO sent to a vendor (`DRAFT → SUBMITTED`).
- **Goods Receipt (GR)** — receiving items against a PO (out of scope for this workshop's implementation, schema/API only).

The PR module and Dashboard are prebuilt in the baseline. The PO module (list/create/detail + validations) is the participant implementation focus.

## 2. Architecture

```mermaid
flowchart LR
    U[Browser] --> V[Vue 3 + Vite SPA]
    V -->|HTTP REST / JSON| B[Fastify API]
    B --> D[(PostgreSQL - Docker)]
```

- **Frontend**: Vue 3 + Vite, plain JavaScript, `vue-router` for page navigation, a single `frontend/src/api.js` module wrapping `fetch` calls.
- **Backend**: Fastify, JavaScript, REST/JSON, thin route handlers that delegate business rules to service modules.
- **Database**: PostgreSQL running in Docker, schema defined in `db/migrations/001_init_procurement_mvp.sql`.

## 3. Pages and navigation

```mermaid
flowchart TD
  HOME[Home / Dashboard]
  PRL[PR List Page]
  POL[PO List Page]
  PRC[PR Create Page]
  PRD[PR Detail Page]
  POC[PO Create Page]
  POD[PO Detail Page]

  HOME --> PRL
  HOME --> POL

  PRL --> PRC
  PRL --> PRD
  POL --> POC
  POL --> POD

  PRC --> PRD
  PRD -->|"select approved PR"| POC
  POC --> POD
```

Routes (`frontend/src/router/index.js`):

| Path | Page | Purpose |
|---|---|---|
| `/` | `DashboardPage` | Overview stats + recent PRs |
| `/requisitions` | `RequisitionListPage` | List all PRs |
| `/requisitions/new` | `RequisitionCreatePage` | Create a PR |
| `/requisitions/:id` | `RequisitionDetailPage` | View/submit/approve a PR |
| `/purchase-orders` | `POListPage` | List all POs |
| `/purchase-orders/new` | `POCreatePage` | Create a PO from an approved PR's open lines |
| `/purchase-orders/:id` | `PODetailPage` | View/submit a PO |

## 4. End-to-end user flow

```mermaid
flowchart TD
    A([Start]) --> B["Create Purchase Requisition\n(PR Create Page)"]
    B --> C["Submit PR"]
    C --> D["Approve PR"]
    D --> E{PR Approved?}
    E -- No --> D
    E -- Yes --> F["Go to PO Create Page\nSelect approved PR"]
    F --> G["Fetch PR open lines\nAllocate quantities per line"]
    G --> H{"Allocation qty <= PR line\nremaining qty?"}
    H -- No --> I["Show validation error\nAdjust quantities"]
    I --> G
    H -- Yes --> J["Submit PO creation form"]
    J --> K["PO created as DRAFT\nPR line qty_allocated updated"]
    K --> L["Open PO Detail Page"]
    L --> M["Submit PO"]
    M --> N{PO status == DRAFT?}
    N -- No --> O["Show error:\nPO must be DRAFT to submit"]
    N -- Yes --> P["PO status -> SUBMITTED"]
    P --> Q([End: PO ready for Goods Receipt - out of scope])
```

## 5. Sequence diagram: Create Purchase Order

This covers the primary participant backlog flow: selecting an approved PR, allocating its open lines, and creating a PO.

```mermaid
sequenceDiagram
    actor User
    participant FE as Vue Frontend
    participant API as Fastify API
    participant SVC as purchase-order-service.js
    participant DB as PostgreSQL

    User->>FE: Open "PO Create" page
    FE->>API: GET /api/requisitions
    API->>DB: SELECT approved requisitions
    DB-->>API: rows
    API-->>FE: { items: [...APPROVED PRs] }
    FE-->>User: Show PR dropdown

    User->>FE: Select a PR
    FE->>API: GET /api/requisitions/:id/open-lines
    API->>DB: SELECT pr_lines WHERE remaining qty > 0
    DB-->>API: rows
    API-->>FE: { lines: [...open lines w/ remaining qty] }
    FE-->>User: Show line allocation table

    User->>FE: Enter vendor name + allocation qty per line
    FE->>FE: Client-side validate\n(qty > 0, qty <= remaining)
    User->>FE: Submit form

    FE->>API: POST /api/purchase-orders\n{ vendorName, lines: [...] }
    API->>SVC: createPurchaseOrder(db, payload)
    SVC->>SVC: validateCreatePayload(payload)
    alt payload invalid
        SVC-->>API: throws 422 error
        API-->>FE: 422 { message }
        FE-->>User: Show inline error
    else payload valid
        SVC->>DB: SELECT pr_line, check qty_allocated + qty <= qty_requested
        alt over-allocation
            DB-->>SVC: current allocation
            SVC-->>API: throws 422\n"allocation exceeds remaining qty"
            API-->>FE: 422 { message }
            FE-->>User: Show inline error
        else within remaining qty
            SVC->>DB: INSERT purchase_orders (status=DRAFT)
            SVC->>DB: INSERT po_lines
            SVC->>DB: INSERT pr_line_allocations
            SVC->>DB: UPDATE pr_lines SET qty_allocated += allocated_qty
            DB-->>SVC: commit
            SVC-->>API: created PO (with lines)
            API-->>FE: 201 { id, poNumber, status: DRAFT, ... }
            FE-->>User: Redirect to PO Detail page
        end
    end
```

## 6. Sequence diagram: Submit Purchase Order

```mermaid
sequenceDiagram
    actor User
    participant FE as Vue Frontend
    participant API as Fastify API
    participant SVC as purchase-order-service.js
    participant DB as PostgreSQL

    User->>FE: Open "PO Detail" page
    FE->>API: GET /api/purchase-orders/:id
    API->>SVC: getPurchaseOrderById(db, id)
    SVC->>DB: SELECT purchase_orders + po_lines + allocations
    DB-->>SVC: rows
    SVC-->>API: PO with lines
    API-->>FE: 200 { id, poNumber, status, vendorName, lines }
    FE-->>User: Render header + lines + Submit button

    User->>FE: Click "Submit"
    FE->>API: POST /api/purchase-orders/:id/submit
    API->>SVC: submitPurchaseOrder(db, id)
    SVC->>DB: SELECT purchase_orders WHERE id
    alt PO not found
        DB-->>SVC: no rows
        SVC-->>API: null
        API-->>FE: 404 { message: "Purchase order not found" }
    else PO status != DRAFT
        DB-->>SVC: row (status=SUBMITTED)
        SVC-->>API: throws 422\n"PO must be DRAFT to submit"
        API-->>FE: 422 { message }
        FE-->>User: Show inline error
    else PO status == DRAFT
        DB-->>SVC: row (status=DRAFT)
        SVC->>DB: UPDATE purchase_orders SET status='SUBMITTED'
        DB-->>SVC: updated row
        SVC-->>API: updated PO
        API-->>FE: 200 { status: "SUBMITTED", ... }
        FE-->>User: Update status badge to "Submitted"
    end
```

## 7. Key business rules

- **Allocation limit**: `allocated qty <= PR line remaining qty` (`qty_requested - qty_allocated`), enforced both client-side (immediate feedback) and server-side (authoritative, `422` on violation).
- **PR must be `APPROVED`** before its lines can be allocated to a PO.
- **PO must be `DRAFT`** to be submitted; submitting a non-`DRAFT` PO returns `422`.
- Route handlers stay thin; all business rules live in `backend/src/services/*-service.js`.
