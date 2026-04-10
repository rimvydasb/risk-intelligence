# Story: Toolbar Filters — Year Range & Procurement Value

**Status:** Proposed  
**Author:** Copilot  
**Related Architecture Sections:** §7 (Presentation Layer), §11 (API Design), §10 (Cytoscape.js Visualization Layer)

---

## Context

The top toolbar currently contains only a global search bar. Investigators analysing procurement graphs need to
**narrow the visible dataset** to a specific time window and contract size range. Without these controls, the graph
renders all procurement history simultaneously, making it hard to isolate bid-rigging patterns within a single
procurement cycle or to focus on high-value contracts.

---

## Goal

Add two filter controls to the top `AppBar` toolbar on the graph dashboard:

1. **Year Range** — `From Year` / `To Year` selectors (dropdowns or number inputs) that filter which contract edges
   appear in the graph based on `Contract.signedAt`.
2. **Procurement Value** — A minimum contract value input (EUR) so low-value contracts can be hidden to reduce noise.

Filters apply globally to the graph's visible elements. They are passed as query parameters to the API route that
supplies graph data, so only relevant edges (and orphaned nodes) are returned — no client-side data bloat.

---

## Requirements

### R1 — Toolbar Controls

Add to the `AppBar` in `src/app/page.tsx`, to the right of the search bar:

| Control      | Component                       | Default      | Behaviour                              |
|--------------|---------------------------------|--------------|----------------------------------------|
| Year From    | `Select` / `TextField` (number) | `2010`       | Min year for `Contract.signedAt`       |
| Year To      | `Select` / `TextField` (number) | current year | Max year for `Contract.signedAt`       |
| Min Value    | `TextField` (number, EUR)       | `0`          | Hide contracts with `value < minValue` |
| Apply button | `Button`                        | —            | Triggers graph reload with new params  |

- Show year options from `2010` to current year (dynamic list).
- All three filter controls collapse gracefully on narrow viewports (stack or hide behind an icon).
- Filter state is stored in React state (`filterParams`). The Apply button triggers a re-fetch.
- Active filters are visually indicated (e.g. a small active-filter chip count badge on the toolbar).

### R2 — API: `/api/entities/initial` accepts filter params

Extend the route handler to accept optional query parameters:

```
GET /api/entities/initial?yearFrom=2020&yearTo=2024&minValue=100000
```

- `yearFrom` (integer) — only include contracts where `YEAR(signedAt) >= yearFrom`
- `yearTo` (integer) — only include contracts where `YEAR(signedAt) <= yearTo`
- `minValue` (float) — only include contracts where `value >= minValue`
- All params are optional; defaults preserve current behaviour (no filtering)
- Contract edges below the value threshold are omitted from the Cytoscape elements response
- Buyer nodes that become orphaned (no remaining contract edges) are also omitted

### R3 — API: `/api/entities/[id]/network` accepts the same filter params

When a user expands a node (lazy-load), the same year/value filters should apply:

```
GET /api/entities/{id}/network?depth=1&yearFrom=2020&yearTo=2024&minValue=100000
```

### R4 — GraphView accepts an `endpoint` override prop

`GraphView` currently hard-codes the fetch URL to `/api/entities/initial`. To support dynamic filter params, it
should accept a `dataUrl` prop so `page.tsx` can pass the full URL with query string:

```tsx
<GraphView dataUrl={buildGraphUrl(filters)} onNodeClick={handleNodeClick}/>
```

`buildGraphUrl(filters)` is a helper in `page.tsx` that constructs the URL with the current filter params.

### R5 — Persist filters in hash URL

Append filter params to the hash so they survive page refresh and can be shared as deep links:

```
/#/?yearFrom=2020&yearTo=2024&minValue=100000
```

`useHashRouter` already exposes `route`. Extend it (or add a sibling utility) to parse and serialise query params
from the hash portion.

---

## Out of Scope

- Maximum value filter (min is sufficient for noise reduction)
- Relationship (PersonRelationship) date filtering — deferred
- Filter persistence in localStorage — deferred
- Animated graph transition between filter states — deferred

---

## Acceptance Criteria

1. The toolbar displays `Year From`, `Year To`, and `Min Value (EUR)` controls beside the search bar
2. Clicking Apply re-fetches the graph with the selected params; the graph updates without a full page reload
3. `/api/entities/initial` returns only contract edges matching the filters
4. Orphaned buyer nodes (no remaining edges) are excluded from the response
5. The network expand API (`/api/entities/[id]/network`) also honours the same filters
6. Default state (no filters changed) produces identical output to current behaviour
7. Filter params are reflected in the hash URL and are restored on page load
8. `npm run build` passes with zero TypeScript errors
9. `npm test` passes — unit tests for the URL builder + API filter logic
10. Cypress test verifies: setting a year filter and clicking Apply changes the graph edge count

---

## References

- ARCHITECTURE.md §7 — Presentation Layer (Strictly SPA — Hash Routing)
- ARCHITECTURE.md §10 — Cytoscape.js Visualization Layer
- ARCHITECTURE.md §11 — API Design (`/api/entities/initial`, `/api/entities/{id}/network`)
- `src/app/page.tsx` — toolbar and `GraphView` usage
- `src/components/GraphView.tsx` — current data-fetch logic
- `src/app/api/entities/initial/route.ts` — initial graph endpoint
- `src/app/api/entities/[id]/network/route.ts` — network expand endpoint
- `src/lib/useHashRouter.ts` — hash routing hook

---

## Next Steps

- [ ] Ensure project compiles and existing tests are passing
- [ ] Extend `useHashRouter` (or add `useHashQuery` utility) to parse/serialise filter params from the hash query string
- [ ] Add `filterParams` state and `buildGraphUrl(filters)` helper to `src/app/page.tsx`
- [ ] Add `Year From`, `Year To`, and `Min Value` controls to the `AppBar` toolbar in `src/app/page.tsx`
- [ ] Add Apply button with active-filter count badge indicating non-default filter state
- [ ] Update `GraphView` to accept a `dataUrl` prop and use it for data fetching instead of the hardcoded URL
- [ ] Update `src/app/api/entities/initial/route.ts` to accept and apply `yearFrom`, `yearTo`, `minValue` query params (
  Prisma `where` on `Contract.signedAt` and `Contract.value`; prune orphaned buyer nodes)
- [ ] Update `src/app/api/entities/[id]/network/route.ts` to accept and apply the same filter params
- [ ] Write Jest unit tests for the URL builder utility and API filter parsing logic
- [ ] Write Cypress test verifying that applying a year filter visibly changes the graph (edge count or node count
  assertion)
- [ ] Update required documentation after the implementation is complete
- [ ] Ensure new tests are added for the new feature and all tests are passing
- [ ] Perform linting and formatting to maintain code quality and consistency
- [ ] Review the implementation to ensure it meets the requirements and follows best practices
- [ ] Mark all checkboxes as done in this document once verified
