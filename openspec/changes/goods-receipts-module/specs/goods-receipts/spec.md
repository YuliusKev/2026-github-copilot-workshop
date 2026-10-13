# Spec Delta

## Purpose

Allow users to record supplier deliveries against submitted purchase orders and reliably track received quantities through the procurement flow.

## ADDED Requirements

### Requirement: Users can list goods receipts

The system SHALL return goods receipts ordered by creation time with their receipt number, related purchase order, status, and receipt date.

#### Scenario: List receipts

- **WHEN** a user requests the goods receipt collection
- **THEN** the system returns an `items` array containing receipt summaries, including an empty array when no receipts exist

### Requirement: Users can create draft goods receipts

The system SHALL create a DRAFT goods receipt for a SUBMITTED purchase order with at least one valid line whose positive received quantity does not exceed that PO line's current open quantity.

#### Scenario: Create receipt for open PO lines

- **WHEN** a user submits a receipt for a SUBMITTED purchase order with valid lines
- **THEN** the system creates and returns a DRAFT receipt with its header and lines

#### Scenario: Reject invalid receipt quantities or lines

- **WHEN** a user submits an empty receipt, a non-positive quantity, a PO line from another order, or a quantity greater than the line's open quantity
- **THEN** the system rejects the request with a clear validation error and does not create a receipt

#### Scenario: Reject receipt for an unsubmitted purchase order

- **WHEN** a user attempts to create a receipt for a DRAFT or missing purchase order
- **THEN** the system rejects the request and does not create a receipt

### Requirement: Users can inspect goods receipt details

The system SHALL return a goods receipt's header, status, related purchase order, and receipt lines, and SHALL report when the requested receipt does not exist.

#### Scenario: Get an existing receipt

- **WHEN** a user requests a receipt by ID that exists
- **THEN** the system returns its header and lines with received quantities and actual site codes

#### Scenario: Get a missing receipt

- **WHEN** a user requests a receipt by an unknown ID
- **THEN** the system returns a not-found response

### Requirement: Users can post draft goods receipts

The system SHALL transition a valid DRAFT receipt to POSTED only when each line still fits within its PO line's open quantity, and SHALL update the PO and linked PR received quantities atomically.

#### Scenario: Post receipt and update received quantities

- **WHEN** a user posts a DRAFT receipt whose lines remain within their PO line open quantities
- **THEN** the system marks the receipt POSTED and increases the corresponding PO and linked PR received quantities by the received amounts

#### Scenario: Prevent concurrent over-receipt

- **WHEN** another receipt has consumed any quantity needed by a receipt being posted
- **THEN** the system rejects posting without changing the receipt or any received-quantity counters

#### Scenario: Reject posting a receipt in an invalid state

- **WHEN** a user posts a receipt that is already POSTED or does not exist
- **THEN** the system returns a clear invalid-state or not-found response without changing quantities
