# Spec Delta

## Purpose

This capability lets users mark purchase orders for later reference and find those orders from the existing purchase-order views. Bookmark state is shared and persistent because this MVP does not identify individual users.

## ADDED Requirements

### Requirement: Users can bookmark purchase orders

The system SHALL allow users to add or remove a shared bookmark on an existing purchase order, and SHALL preserve that state across requests and browser sessions.

#### Scenario: Bookmark a purchase order

- **WHEN** a user bookmarks an existing purchase order
- **THEN** the system records it as bookmarked and subsequent PO list and detail responses report `isBookmarked: true`

#### Scenario: Remove a purchase order bookmark

- **WHEN** a user removes a bookmark from an existing purchase order
- **THEN** the system records it as not bookmarked and subsequent PO list and detail responses report `isBookmarked: false`

#### Scenario: Bookmark a missing purchase order

- **WHEN** a user attempts to change bookmark state for a purchase order that does not exist
- **THEN** the system returns a not-found response and does not create bookmark state

### Requirement: Purchase order views show bookmark state

The system SHALL show whether each purchase order is bookmarked and provide an action to add or remove its bookmark from the PO list and detail views.

#### Scenario: View a bookmarked purchase order

- **WHEN** a user opens the PO list or a purchase order detail view
- **THEN** the view identifies bookmarked purchase orders and offers the remove-bookmark action

#### Scenario: View an unbookmarked purchase order

- **WHEN** a user opens the PO list or a purchase order detail view
- **THEN** the view offers the add-bookmark action for unbookmarked purchase orders

### Requirement: Users can filter the PO list to bookmarks

The system SHALL allow users to request and view only bookmarked purchase orders in the PO list.

#### Scenario: Filter to bookmarked purchase orders

- **WHEN** a user enables the bookmarked-only filter
- **THEN** the PO list contains only bookmarked purchase orders

#### Scenario: No purchase orders are bookmarked

- **WHEN** a user enables the bookmarked-only filter and no purchase orders are bookmarked
- **THEN** the PO list displays its empty state
