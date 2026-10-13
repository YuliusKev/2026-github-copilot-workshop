# How the Procurement MVP Works

This guide describes the implemented Dashboard, Purchase Requisition (PR), Purchase Order (PO), and Goods Receipt (GR) workflows.

## Application Structure

The browser runs a Vue 3 application. Vue pages call the REST API through `frontend/src/api.js`; Fastify routes delegate to PR, PO, and GR service functions, which read and write PostgreSQL. The database runs in Docker.

```mermaid
flowchart LR
    User[User] --> Browser[Vue 3 application]
    Browser -->|REST JSON| API[Fastify API]
    API --> Services[PR, PO, and GR services]
    Services --> DB[(PostgreSQL)]
```

## User Workflow

The Dashboard links to the PR and PO lists and shows PR totals by status, plus the five most recently created PRs. The navigation also links to goods receipts. To create a PO, at least one PR must be approved and have unallocated quantity remaining; to receive goods, a PO must be submitted and have open quantity.

```mermaid
flowchart TD
    Dashboard[Dashboard] --> PRList[PR list]
    Dashboard --> POList[PO list]
    Dashboard --> CreatePR[Create PR]
    PRList --> CreatePR
    PRList --> PRDetail[PR detail]
    CreatePR --> SavePR[Save PR as draft]
    SavePR --> PRDetail
    PRDetail -->|Submit PR| PRSubmitted[PR submitted]
    PRSubmitted -->|Approve PR| PRApproved[PR approved]
    PRApproved --> POList
    POList --> CreatePO[Create PO]
    CreatePO --> FindLines[Load approved PR open lines]
    FindLines --> Allocate{Select lines and set quantities}
    Allocate -->|Invalid or stale quantity| FindLines
    Allocate -->|Valid: save draft| PODraft[PO draft]
    Allocate -->|Valid: submit| POSubmitted[PO submitted]
    PODraft --> PODetail[PO detail]
    POSubmitted --> PODetail
    PODetail -->|Submit draft PO| POSubmitted
```

### Purchase Requisitions

1. From the Dashboard or PR list, open **New PR** and enter the requester, department, title, and one or more item lines. Each line needs an item code/name, positive requested quantity, unit of measure, estimated unit price, and site; optional fields include dates, notes, and budget center.
2. **Save As Draft** creates the PR and opens its detail page. The detail page shows the saved header and lines.
3. Submit a draft PR. The detail page then offers **Approve PR** for a submitted PR. These actions are restricted to the `DRAFT → SUBMITTED → APPROVED` sequence.

### Purchase Orders

1. Open **Purchase Orders** and choose **New PO**. The page loads open lines from approved PRs; fully allocated lines are excluded. If none are available, approve a PR with remaining quantity first.
2. Enter a vendor, select PR lines, and set order quantities. Delivery address defaults to the PR line's site, and delivery date defaults to that line's required date. The page shows the selected-line count and estimated total.
3. Choose **Save As Draft** to create a draft PO, or **Submit PO** to create it and submit it immediately. A draft can also be submitted from its detail page. Once saved from the create page, its form is locked because there is no PO update operation.
4. The PO list links to details showing the vendor, status, PO lines, quantities, and their source PR allocations.

PO validation requires a vendor and at least one selected line. Each quantity must be positive and no greater than the source PR line's remaining quantity; unit price cannot be negative and the delivery site is required. The backend rechecks that each PR is approved and locks its line during allocation, so a stale or concurrent over-allocation is rejected with HTTP `422` and a message. A PO can only transition from `DRAFT` to `SUBMITTED`.

Currency, payment terms, and notes are displayed in the generated PO form but are not stored by the current API/schema. There is no PO edit operation.

### Goods Receipts

1. Open a submitted PO with open quantity and choose **Receive Goods**, or open **Goods Receipts** and choose **New GR**.
2. Select one or more open PO lines, enter a positive quantity no greater than each line's open quantity, and confirm the actual receiving site. The site defaults to the PO line's site; quantities may be partial.
3. **Save As Draft** creates a receipt that can be inspected from the GR list and detail page. Drafts do not reserve PO quantity, so another receipt may use that quantity before this draft is posted.
4. **Post Receipt** rechecks current open quantities. On success, the receipt changes from `DRAFT` to `POSTED`, and PO and linked PR received quantities increase atomically. If another receipt used the remaining quantity first, posting fails without changing counters and the draft remains available.

The GR API exposes `GET /api/goods-receipts`, `POST /api/goods-receipts`, `GET /api/goods-receipts/:id`, and `POST /api/goods-receipts/:id/post`. Invalid payloads and over-receipt attempts return a message response; posting a stale draft is rejected after the quantity is rechecked.

## Request Sequence

This sequence shows the main path from a new requisition through a submitted purchase order. The frontend obtains approved PR open lines before showing allocation choices. A submit from the PO create page first creates a draft, then submits it.

```mermaid
sequenceDiagram
    actor User
    participant Vue as Vue application
    participant API as Fastify REST API
    participant Service as PR/PO service
    participant DB as PostgreSQL

    User->>Vue: Create PR and save draft
    Vue->>API: POST /api/requisitions
    API->>Service: Validate and create PR
    Service->>DB: Insert PR header and lines (transaction)
    DB-->>Service: Saved records
    Service-->>API: PR detail
    API-->>Vue: 201 Created
    Vue-->>User: Show PR detail

    User->>Vue: Submit PR
    Vue->>API: POST /api/requisitions/:id/submit
    API->>Service: Check status and submit
    Service->>DB: Update DRAFT to SUBMITTED
    DB-->>Service: Updated PR
    Service-->>API: PR detail
    API-->>Vue: PR detail

    User->>Vue: Approve PR
    Vue->>API: POST /api/requisitions/:id/approve
    API->>Service: Check status and approve
    Service->>DB: Update SUBMITTED to APPROVED
    DB-->>Service: Updated PR
    Service-->>API: PR detail
    API-->>Vue: PR detail

    User->>Vue: Open New PO
    Vue->>API: GET /api/requisitions
    API->>Service: List requisitions
    Service->>DB: Select PR headers
    DB-->>Service: Requisition list
    Service-->>Vue: PR list
    loop Each approved PR
        Vue->>API: GET /api/requisitions/:id/open-lines
        API->>Service: Get unallocated PR lines
        Service->>DB: Select PR lines and quantities
        DB-->>Service: Open lines
        Service-->>Vue: Approved PR open lines
    end

    User->>Vue: Select lines and save or submit PO
    Vue->>API: POST /api/purchase-orders
    API->>Service: Validate and allocate quantities
    Service->>DB: Validate and save PO allocation transaction
    DB-->>Service: Commit transaction
    Service-->>Vue: PO detail with DRAFT status
    alt Submit selected
        Vue->>API: POST /api/purchase-orders/:id/submit
        API->>Service: Check status and submit
        Service->>DB: Update DRAFT to SUBMITTED
        DB-->>Service: Updated PO
        Service-->>API: PO detail with SUBMITTED status
        API-->>Vue: PO detail with SUBMITTED status
    else Save draft selected
        Vue-->>User: Show draft saved
    end
```

## Main Pages and API

| Page      | Route                  | Main API calls                                                                                                                                               |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard | `/`                    | `GET /api/requisitions`                                                                                                                                      |
| PR list   | `/requisitions`        | `GET /api/requisitions`                                                                                                                                      |
| PR create | `/requisitions/new`    | `POST /api/requisitions`                                                                                                                                     |
| PR detail | `/requisitions/:id`    | `GET /api/requisitions/:id`, `POST /api/requisitions/:id/submit`, `POST /api/requisitions/:id/approve`                                                       |
| PO list   | `/purchase-orders`     | `GET /api/purchase-orders`, `POST /api/purchase-orders/:id/bookmark`, `DELETE /api/purchase-orders/:id/bookmark`                                             |
| PO create | `/purchase-orders/new` | `GET /api/requisitions`, `GET /api/requisitions/:id/open-lines`, `POST /api/purchase-orders`, `POST /api/purchase-orders/:id/submit`                         |
| PO detail | `/purchase-orders/:id` | `GET /api/purchase-orders/:id`, `POST /api/purchase-orders/:id/submit`, `POST /api/purchase-orders/:id/bookmark`, `DELETE /api/purchase-orders/:id/bookmark` |
| GR list   | `/goods-receipts`      | `GET /api/goods-receipts`                                                                                                                                    |
| GR create | `/goods-receipts/new`  | `GET /api/purchase-orders`, `GET /api/purchase-orders/:id/open-lines`, `POST /api/goods-receipts`                                                            |
| GR detail | `/goods-receipts/:id`  | `GET /api/goods-receipts/:id`, `POST /api/goods-receipts/:id/post`                                                                                           |

The API exposes `GET /api/purchase-orders/:id/open-lines` for PO lines with quantity still open for receipt. GR posting rechecks those quantities and updates PO and linked PR counters atomically. The Dashboard's GR wording remains informational; receipt data is available through the GR navigation and pages.

Each PO list item and detail response includes `isBookmarked`. Add a shared bookmark with `POST /api/purchase-orders/:id/bookmark` and remove it with `DELETE /api/purchase-orders/:id/bookmark`; both operations are idempotent and return the updated state. A missing PO returns `404`. Add `?bookmarked=true` to `GET /api/purchase-orders` to list only bookmarked POs; without the query, the endpoint returns all POs.
