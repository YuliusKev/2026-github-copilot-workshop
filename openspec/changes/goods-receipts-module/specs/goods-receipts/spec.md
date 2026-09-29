## ADDED Requirements

### Requirement: Create Goods Receipt
The system SHALL allow creating a Goods Receipt (GR) in `DRAFT` status against a Purchase Order (PO) that is in `SUBMITTED` status, with one or more GR lines each referencing an existing PO line and a received quantity.

#### Scenario: Successful GR creation
- **WHEN** a client submits `POST /api/goods-receipts` with a valid `poId` and one or more lines (`poLineId`, `qtyReceived`, `actualSiteCode`)
- **THEN** the system creates a GR with a generated `grNumber`, status `DRAFT`, and persists the GR lines, returning the created GR with a 201 status

#### Scenario: Reject GR against non-submitted PO
- **WHEN** a client submits `POST /api/goods-receipts` with a `poId` referencing a PO whose status is not `SUBMITTED`
- **THEN** the system rejects the request with a 422 response and a clear error message, and creates no GR records

#### Scenario: Reject GR line exceeding PO line open quantity
- **WHEN** a client submits a GR line whose `qtyReceived` is greater than the referenced PO line's open quantity (`qty_ordered - qty_received`)
- **THEN** the system rejects the request with a 422 response and a clear error message, and creates no GR records

#### Scenario: Reject GR line with non-positive quantity
- **WHEN** a client submits a GR line with `qtyReceived` <= 0
- **THEN** the system rejects the request with a 422 response and creates no GR records

#### Scenario: Reject GR referencing unknown PO line
- **WHEN** a client submits a GR line whose `poLineId` does not belong to the referenced `poId`
- **THEN** the system rejects the request with a 422 response and creates no GR records

### Requirement: Post Goods Receipt
The system SHALL allow transitioning a `DRAFT` Goods Receipt to `POSTED` status exactly once, atomically updating the received quantities on the associated PO lines and, via the PR-line allocation chain, on the associated PR lines.

#### Scenario: Successful GR posting
- **WHEN** a client submits `POST /api/goods-receipts/:id/post` for a GR in `DRAFT` status
- **THEN** the system sets the GR status to `POSTED`, increments `po_lines.qty_received` by each GR line's `qty_received` for the corresponding PO line, increments the allocated PR lines' `qty_received` proportionally to their `allocated_qty` share of the PO line, and returns the updated GR

#### Scenario: Reject posting an already-posted GR
- **WHEN** a client submits `POST /api/goods-receipts/:id/post` for a GR whose status is already `POSTED`
- **THEN** the system rejects the request with a 422 response and does not modify any quantities

#### Scenario: Reject posting a non-existent GR
- **WHEN** a client submits `POST /api/goods-receipts/:id/post` for an id that does not exist
- **THEN** the system returns a 404 response

### Requirement: Get Goods Receipt
The system SHALL allow retrieving a Goods Receipt by id, including its header fields and all GR lines with the PO line details they reference.

#### Scenario: Successful GR retrieval
- **WHEN** a client submits `GET /api/goods-receipts/:id` for an existing GR
- **THEN** the system returns the GR header (`id`, `grNumber`, `poId`, `status`, `receiptDate`, `notes`, `createdAt`, `updatedAt`) and its lines (`id`, `lineNo`, `poLineId`, `itemCode`, `itemName`, `qtyReceived`, `actualSiteCode`)

#### Scenario: GR not found
- **WHEN** a client submits `GET /api/goods-receipts/:id` for an id that does not exist
- **THEN** the system returns a 404 response with a clear error message
