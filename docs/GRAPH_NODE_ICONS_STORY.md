# Story: Graph Node Icons

**Status:** Proposed  
**Author:** Copilot  
**Related Architecture Sections:** §10 (Cytoscape.js Visualization Layer), §15 (Use Case Implementation Details)

---

## Context

The current graph uses color, size, and basic geometric shapes to distinguish node types, but the visual language is
still relatively generic. Investigators need faster recognition of the most important semantic distinction in the graph:

- **Institution / buyer nodes** should read immediately as public bodies
- **Person nodes** should read immediately as natural persons

The requested design direction is:

- institution nodes use Material UI's `CorporateFare` icon
- person nodes use Material UI's `Person` icon

This story evaluates whether that is feasible in the current Cytoscape-based graph and defines the implementation path.

---

## Goal

Improve graph readability by rendering iconography inside Cytoscape nodes:

1. **Institution nodes** (`type="buyer"`) display a building-style icon based on Material UI `CorporateFare`
2. **Person nodes** (`type="person"`) display a person icon based on Material UI `Person`
3. The icon treatment must remain compatible with Cytoscape rendering, force-directed layouts, zooming, panning, and
   dense graph cycles
4. The graph must remain a single mounted canvas with no modal overlay and no React-driven node remounting

---

## Feasibility

### Confirmed Feasible

This is **possible** in Cytoscape.js by using node image styling, typically via:

- `background-image`
- SVG assets
- inline SVG data URIs

This means the desired Material UI iconography can be used **visually** in the graph.

### Important Constraint

This is **not** possible by rendering React or JSX directly inside Cytoscape nodes.

So this will **not** work:

```tsx
<CorporateFareIcon/>
<PersonIcon/>
```

inside the Cytoscape canvas as live React components.

Instead, the implementation should:

1. convert the desired icon shape into SVG markup
2. expose it as an asset or encoded data URI
3. assign it to Cytoscape node style rules by node type

### Performance-First Recommendation

Yes — the Material UI icons can be reduced to raw SVG and reused without mounting React components inside the graph.

For this project, the most performance-efficient approach is:

1. extract the minimal SVG path(s) for `CorporateFare` and `Person`
2. keep them as **small, optimized SVG strings**
3. convert them once into Cytoscape-compatible image sources
4. reuse the same source for all matching nodes

Recommended preference order:

| Variant                                 | Performance                               | Caching | Bundle simplicity | Recommendation                                         |
|-----------------------------------------|-------------------------------------------|---------|-------------------|--------------------------------------------------------|
| Shared external SVG asset               | Best for repeated reuse across many nodes | Best    | Good              | **Best default if we want maximum runtime efficiency** |
| Shared inline SVG data URI constant     | Very good for 2-3 tiny icons              | None    | Best              | **Good fallback and likely acceptable here**           |
| Per-node generated SVG string           | Worse                                     | None    | Poor              | Avoid                                                  |
| Live React / MUI icon component in node | Not supported in Cytoscape                | N/A     | N/A               | Not possible                                           |

Because this graph needs only a very small icon set, **optimized SVG is the right direction**. Inline SVG is viable if
we
keep a single shared constant per icon. If we want the strict best-performance option for repeated rendering, use a
shared static SVG asset URL so the browser can cache it independently.

### Compatibility with Cycles

This is fine even in dense graphs or node cycles. Cycles affect graph topology and layout, not whether a node can render
an icon image. The main concern is readability at small node sizes, so icon rendering should be paired with:

- minimum node dimensions
- `background-fit: contain`
- carefully chosen padding / contrast

---

## Current Node and Role Inventory

The application currently distinguishes between **graph node type** and **business role**. Those are related, but they
are not the same thing.

### Graph node types emitted today

These are the actual node types currently rendered by `src/app/api/entities/initial/route.ts` and styled in
`src/components/GraphView.tsx`.

| Graph node type | Source model / origin              | Current ID shape    | Meaning in graph                     | Notes                                                                                           |
|-----------------|------------------------------------|---------------------|--------------------------------------|-------------------------------------------------------------------------------------------------|
| `company`       | `Company`                          | `jarKodas`          | Legal entity / supplier-side company | Used for company nodes loaded from network relationships                                        |
| `person`        | `Person`                           | `uid`               | Natural person                       | Connected to companies via `PersonRelationship`                                                 |
| `buyer`         | `Contract.buyerCode` + `buyerName` | `buyer-{buyerCode}` | Procurement buyer / institution node | Rendered as a separate node type, even if the buyer could also exist as a company in the domain |

### Edge types emitted today

These are not nodes, but they matter for interpreting the graph model.

| Edge type                              | Source                                             | Meaning                                               |
|----------------------------------------|----------------------------------------------------|-------------------------------------------------------|
| relationship edge (no explicit `type`) | `PersonRelationship` / recursive network traversal | Person ↔ company links such as owner / CEO / UBO      |
| `contract`                             | `Contract`                                         | Supplier company → buyer institution procurement edge |

### Business roles present in the data model

The data model contains roles that can overlap on the same real-world entity.

| Role / concept           | Where it exists                                                                      | What it means                                                                | Can overlap? |
|--------------------------|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------|--------------|
| Supplier                 | `Contract.supplierId -> Company`                                                     | A company that sells into procurement                                        | Yes          |
| Buyer                    | `Contract.buyerCode`, `ProcurementYear.asBuyerEur`, `TopCounterparty.role = "buyer"` | An organization that buys through procurement                                | Yes          |
| Person relationship role | `PersonRelationship.role`                                                            | A person's role relative to a company (`owner`, `ceo`, `ubo`)                | Yes          |
| Counterparty role        | `TopCounterparty.role`                                                               | A company's counterparty was a buyer or supplier in relation to this company | Yes          |

### Important modeling clarification

Yes — **a company can be both buyer and supplier in the underlying data model**.

Evidence in the current schema:

- `ProcurementYear` stores both `asBuyerEur` and `asSupplierEur` for the same `Company`
- `TopCounterparty.role` explicitly supports both `"buyer"` and `"supplier"`
- `Contract` links a `Company` as supplier, while buyer data is currently stored as denormalized `buyerCode` /
  `buyerName`

However, the **current graph rendering model does not unify those roles into one canonical node identity**. Today:

- supplier-side legal entities render as `company`
- procurement buyers render as separate `buyer` nodes with IDs like `buyer-188704927`

So a real-world organization could conceptually be both buyer and supplier, but the current graph may still render it as
two separate representations unless a future story introduces canonical entity resolution for buyers.

---

## Requirements

### R1 — Institution icon rendering

Nodes representing institutions / buyers (`data.type === "buyer"`) should render a building icon visually derived from
Material UI `CorporateFare`.

- Preserve the current buyer semantic distinction
- Keep buyer nodes readable on light and dark fills
- Do not require HTML overlays inside the graph canvas

### R2 — Person icon rendering

Nodes representing people (`data.type === "person"`) should render a visual derived from:

```ts
import PersonIcon from '@mui/icons-material/Person';
```

Implementation should use the icon's SVG path output as a Cytoscape-compatible image source rather than a React element.

### R3 — Company and buyer semantics remain distinct

The implementation must preserve the current distinction between:

- `company` graph nodes
- `buyer` graph nodes

even though a real-world organization may occupy both buyer and supplier roles in the wider procurement model.

The story should document that this is a **rendering distinction**, not proof that they are always different legal
entities.

### R4 — Company nodes remain distinct

`type="company"` nodes should remain visually distinct from institutions and persons.

The implementation may either:

- keep companies as geometric nodes without iconography, or
- add a future icon treatment in a separate story

This story does **not** require introducing a company icon.

### R5 — Cytoscape-native rendering only

The solution must stay within Cytoscape's supported rendering model:

- no embedding React components directly in nodes
- no modal or DOM-based node replacement
- no approach that causes the graph instance to reload on node styling changes

### R6 — Performance-first asset strategy

The icon implementation should prefer a performance-efficient source strategy:

- extract and optimize SVG from the Material UI icons
- define each icon once
- reuse that same source across all matching nodes
- avoid generating SVG strings repeatedly per node

If static asset URLs and inline SVG constants are both viable, prefer the option with the best cache and memory
characteristics for repeated graph rendering.

### R7 — Styling resilience

The node icon treatment must remain readable across:

- zoom levels
- force-directed layouts
- dense graph clusters
- cyclic node arrangements
- selected node state

### R8 — Testing and fallback behavior

If a node icon asset fails to resolve, the node must still render with a recognizable fallback shape/color.

Tests should cover:

- style assignment by node type
- graph rendering without crashes
- no regression to graph mount lifecycle

---

## Out of Scope

- Rendering arbitrary React/MUI components inside graph nodes
- HTML label overlay systems for every node
- Edge icons or edge badges
- Animated icon states
- Reworking the entire graph theme

---

## Acceptance Criteria

1. Buyer / institution nodes render with a building-style icon aligned to the `CorporateFare` visual
2. Person nodes render with a person-style icon aligned to the `Person` visual
3. The implementation uses optimized SVG extracted from the Material UI icon design, not embedded React components
4. The story documents the currently emitted graph node types and clarifies the distinction between graph type and
   business role
5. The story explicitly documents that a real-world company may be both buyer and supplier in the data model
6. Graph interaction remains stable: no full graph reload when selecting nodes or opening node details
7. Dense subgraphs and cyclic relationships still render correctly with icons applied
8. `npm run build` passes with zero TypeScript errors
9. `npm test` passes

---

## References

- `src/components/GraphView.tsx` — current Cytoscape style rules
- `src/app/api/entities/initial/route.ts` — current graph node typing (`buyer`, `person`, `company`)
- `prisma/schema.prisma` — procurement role modeling (`supplierId`, `buyerCode`, `ProcurementYear`, `TopCounterparty`)
- `@mui/icons-material` — icon source package already present in the project
- Cytoscape.js style model — image-based node styling via `background-image`

---

## Next Steps

- [ ] Ensure project compiles and existing tests are passing
- [ ] Extract and optimize the SVG for `CorporateFare` and `Person`
- [ ] Decide whether shared static SVG assets or shared inline SVG data URI constants are the best runtime choice
- [ ] Add a small graph icon utility that maps node types to shared Cytoscape-compatible icon sources
- [ ] Update `src/components/GraphView.tsx` node styles so `buyer` uses `CorporateFare`-based imagery and `person`
  uses `Person`-based imagery
- [ ] Keep the current `company` / `buyer` graph distinction unless a separate canonical-identity story merges them
- [ ] Keep geometric/color fallback styling for nodes when icons are unavailable
- [ ] Verify icon readability on small nodes, zoomed-out states, and dense cyclic subgraphs
- [ ] Update required documentation after the implementation is complete
- [ ] Ensure new tests are added for the new feature and all tests are passing
- [ ] Perform linting and formatting to maintain code quality and consistency
- [ ] Review the implementation to ensure it meets the requirements and follows best practices
- [ ] Mark all checkboxes as done in this document once verified
