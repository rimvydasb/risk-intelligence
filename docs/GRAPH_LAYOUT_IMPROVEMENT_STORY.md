# Graph Layout Improvement Story — fCoSE Integration

## Overview

The current graph layout uses the standard **CoSE** (Compound Spring Embedder) algorithm. While functional, CoSE
produces messy star-burst topologies when a central hub node (e.g. a large Institution) connects to many leaf nodes
(Person, PrivateCompany). The result is overlapping labels, cluttered edges, and poor visual separation between node
clusters.

This story replaces CoSE with **fCoSE** (Fast Compound Spring Embedder), the industry-standard organic layout for
Cytoscape.js. fCoSE treats nodes as physical objects that cannot occupy the same space, resolves overlaps
automatically, and produces significantly better results for star and mixed topologies.

> `cytoscape-fcose` is already listed as a dependency in `package.json` but is **not yet activated** — the code
> still calls `cy.layout({ name: 'cose' })`. This story wires it up properly.

---

## Goals

1. Replace `cose` with `fcose` in `CytoscapeCanvas.tsx`.
2. Register the `cytoscape-fcose` extension once, before any Cytoscape instance is created (module-level).
3. Tune layout parameters to produce a clean, readable graph for the typical RIS topology (1 hub + N leaves).
4. Support **incremental mode** — when new nodes are added via graph expansion, shift the existing layout instead
   of recalculating the whole graph.
5. Add a TypeScript interface (`FcoseLayoutOptions`) so the layout call is fully type-safe without casts.
6. Ensure the change is covered by existing tests and does not break Cypress E2E flows.

---

## Scope

### In scope

- `src/components/graph/CytoscapeCanvas.tsx` — layout swap + extension registration
- `src/types/graph.ts` (or a new `src/lib/graph/layout.ts`) — `FcoseLayoutOptions` interface
- Jest unit test for the layout options factory (if extracted to a helper)
- README / ARCHITECTURE update noting fCoSE as the active layout engine

### Out of scope

- Edge bundling (separate story if needed)
- Risk-score-driven node sizing (separate story)
- Server-side layout pre-computation

---

## Implementation Details

### 1 — Register the Extension (module level)

```typescript
// src/components/graph/CytoscapeCanvas.tsx  (top of file, before any component code)
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';

cytoscape.use(fcose); // register once; safe to call multiple times
```

Because `CytoscapeCanvas` is already loaded with `dynamic(..., { ssr: false })` there is no SSR risk.

### 2 — TypeScript Interface

Add to `src/types/graph.ts` (or inline in the component):

```typescript
export interface FcoseLayoutOptions extends cytoscape.BaseLayoutOptions {
    name: 'fcose';
    quality?: 'draft' | 'default' | 'proof';
    randomize?: boolean;
    animate?: boolean;
    animationDuration?: number;
    animationEasing?: string;
    fit?: boolean;
    padding?: number;
    nodeDimensionsIncludeLabels?: boolean;
    uniformNodeDimensions?: boolean;
    packComponents?: boolean;
    nodeRepulsion?: (node: cytoscape.NodeSingular) => number;
    idealEdgeLength?: (edge: cytoscape.EdgeSingular) => number;
    edgeElasticity?: (edge: cytoscape.EdgeSingular) => number;
    nestingFactor?: number;
    gravity?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
    incremental?: boolean;
    numIter?: number;
    tile?: boolean;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;

    [key: string]: unknown;
}
```

### 3 — Layout Configuration

Replace the `cy.layout({ name: 'cose', animate: false })` call with:

```typescript
const layoutOptions: FcoseLayoutOptions = {
    name: 'fcose',
    quality: 'default',          // 'proof' for best quality, slower
    randomize: false,
    animate: false,              // keep false to avoid async frame races
    fit: true,
    padding: 40,
    nodeDimensionsIncludeLabels: true,  // prevents label overlap
    uniformNodeDimensions: false,
    nodeRepulsion: () => 6000,   // high repulsion pushes leaf nodes apart
    idealEdgeLength: () => 120,  // breathing room for edge labels
    edgeElasticity: () => 0.45,
    gravity: 0.15,               // low gravity = organic spread, not tight ball
    gravityRange: 3.8,
    numIter: 2500,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    incremental: false,          // set to true when merging nodes incrementally
};

const layout = cy.layout(layoutOptions);
```

**Parameter rationale for star topologies:**

| Parameter                     | Value       | Why                                                                      |
|-------------------------------|-------------|--------------------------------------------------------------------------|
| `nodeRepulsion`               | `6000`      | Pushes leaf nodes (Person, PrivateCompany) away from each other          |
| `idealEdgeLength`             | `120`       | Creates space for edge labels and prevents spoke overlap                 |
| `gravity`                     | `0.15`      | Low gravity prevents the tight "ball" effect; graph can breathe          |
| `nodeDimensionsIncludeLabels` | `true`      | fCoSE treats label bounding boxes as physical objects — no label overlap |
| `quality`                     | `'default'` | Balanced speed vs. quality; switch to `'proof'` for complex graphs       |
| `incremental`                 | `false`     | Full recalculation on initial load; switch to `true` for node merges     |

### 4 — Incremental Node Expansion

When the user expands a node and new elements are merged via `cy.add()`, use `incremental: true` to preserve the
existing layout and gently reposition new nodes:

```typescript
const layout = cy.layout({...layoutOptions, incremental: isExpansion});
```

Pass `isExpansion = toAdd.length > 0 && existingNodeCount > 0` to distinguish initial load from expansion.

---

## Acceptance Criteria

- [ ] Graph no longer has overlapping node labels on the initial load with the default anchor entity.
- [ ] Leaf nodes (Person, PrivateCompany) are visually separated from each other, not clustered together.
- [ ] Hub nodes (Institution, PublicCompany) remain visually central and legible.
- [ ] Expanding a node (clicking + loading new data) adds new nodes without scrambling the existing layout.
- [ ] No TypeScript errors (`npm run build` passes).
- [ ] All 47 Jest unit tests pass.
- [ ] All 9 Cypress E2E tests pass.

---

## Affected Files

| File                                       | Change                                                                   |
|--------------------------------------------|--------------------------------------------------------------------------|
| `src/components/graph/CytoscapeCanvas.tsx` | Register fCoSE extension; replace layout call; add `incremental` support |
| `src/types/graph.ts`                       | Add `FcoseLayoutOptions` interface                                       |
| `docs/ARCHITECTURE.md`                     | Update Technology Stack and Graph Component sections to reference fCoSE  |

---

## Next Steps

- [x] Ensure project compiles and existing tests are passing
- [x] Install / verify `cytoscape-fcose` is present in `package.json` (`npm ls cytoscape-fcose`)
- [x] Add `FcoseLayoutOptions` interface to `src/types/graph.ts`
- [x] Register `cytoscape-fcose` extension at module level in `CytoscapeCanvas.tsx`
- [x] Replace `cose` layout call with `fcose` using tuned parameters from this story
- [x] Implement incremental mode: pass `incremental: true` when merging new nodes into an existing graph
- [x] Verify visually: hub nodes central, leaf nodes separated, no label overlap
- [x] Add Jest unit test for layout options factory (if extracted to helper)
- [x] Run Cypress E2E suite and confirm all 9 tests pass
- [x] Update `docs/ARCHITECTURE.md` — Technology Stack + Graph Component layout engine reference
- [x] Update required documentation after the implementation is complete
- [x] Ensure new tests are added for the new feature and all tests are passing
- [x] Perform linting and formatting to maintain code quality and consistency
- [x] Review the implementation to ensure it meets the requirements and follows best practices
- [x] Mark all checkboxes as done in this document once verified
