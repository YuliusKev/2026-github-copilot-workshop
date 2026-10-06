# Graph Report - .  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 128 nodes · 178 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `72c8acfd`
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `getPurchaseOrderById()` - 6 edges
2. `createPurchaseOrder()` - 6 edges
3. `getRequisitionById()` - 6 edges
4. `createGoodsReceipt()` - 6 edges
5. `createRequisition()` - 5 edges
6. `api` - 5 edges
7. `getGoodsReceiptById()` - 5 edges
8. `postGoodsReceipt()` - 5 edges
9. `submitPurchaseOrder()` - 4 edges
10. `distributeReceiptAcrossAllocations()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `start()` --calls--> `buildApp()`  [EXTRACTED]
  backend/src/server.js → backend/src/app.js

## Import Cycles
- None detected.

## Communities (16 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (9): createGoodsReceipt(), createGrNumber(), distributeReceiptAcrossAllocations(), getGoodsReceiptById(), listGoodsReceipts(), mapHeader(), postGoodsReceipt(), round2() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.23
Nodes (9): createPoNumber(), createPurchaseOrder(), getOpenPoLines(), getPurchaseOrderById(), listPurchaseOrders(), mapHeader(), mapLine(), submitPurchaseOrder() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (10): errorMessage, isSubmitting, notes, receiptDate, receiptLines, route, router, selectedPoId (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (8): addLine(), emptyLine(), errorMessage, form, router, errorMessage, items, api

### Community 4 - "Community 4"
Cohesion: 0.30
Nodes (9): approveRequisition(), createPrNumber(), createRequisition(), getRequisitionById(), getRequisitionOpenLines(), listRequisitions(), mapHeader(), submitRequisition() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (6): goodsReceiptRoutes(), purchaseOrderRoutes(), requisitionRoutes(), buildApp(), config, start()

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (7): allocations, approvedPrs, errorMessage, headerForm, isSubmitting, router, tableRef

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): isGoodsReceipts, isPurchaseOrders, isRequisitions

## Knowledge Gaps
- **27 isolated node(s):** `00-init-mvp-db.sh script`, `router`, `errorMessage`, `form`, `items` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api` connect `Community 3` to `Community 2`, `Community 6`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `00-init-mvp-db.sh script`, `router`, `errorMessage` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._