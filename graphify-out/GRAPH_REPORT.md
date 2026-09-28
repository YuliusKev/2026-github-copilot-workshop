# Graph Report - .  (2026-09-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 69 nodes · 102 edges · 10 communities (6 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `99aed90c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `getPurchaseOrderById()` - 6 edges
2. `createPurchaseOrder()` - 6 edges
3. `getRequisitionById()` - 6 edges
4. `createRequisition()` - 5 edges
5. `submitPurchaseOrder()` - 4 edges
6. `buildApp()` - 3 edges
7. `config` - 3 edges
8. `listPurchaseOrders()` - 3 edges
9. `getOpenPoLines()` - 3 edges
10. `listRequisitions()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `start()` --calls--> `buildApp()`  [EXTRACTED]
  backend/src/server.js → backend/src/app.js

## Import Cycles
- None detected.

## Communities (10 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.23
Nodes (9): createPoNumber(), createPurchaseOrder(), getOpenPoLines(), getPurchaseOrderById(), listPurchaseOrders(), mapHeader(), mapLine(), submitPurchaseOrder() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (8): addLine(), emptyLine(), errorMessage, form, router, errorMessage, items, api

### Community 2 - "Community 2"
Cohesion: 0.30
Nodes (9): approveRequisition(), createPrNumber(), createRequisition(), getRequisitionById(), getRequisitionOpenLines(), listRequisitions(), mapHeader(), submitRequisition() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (5): purchaseOrderRoutes(), requisitionRoutes(), buildApp(), config, start()

## Knowledge Gaps
- **9 isolated node(s):** `00-init-mvp-db.sh script`, `isRequisitions`, `router`, `errorMessage`, `form` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `00-init-mvp-db.sh script`, `isRequisitions`, `router` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._