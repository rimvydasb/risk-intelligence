# Story: Hash-Based Routing — Pure Single-Page Application

**Status:** Proposed  
**Author:** Copilot  
**Related Architecture Sections:** §7 (System Architecture), §8.1 (Repository Structure), §15 (Use Case Implementation
Details)

---

## Context

The system is architecturally declared a **Strictly SPA** (see ARCHITECTURE.md §7, Presentation Layer). However, the
current implementation violates this principle:

- The entity detail view lives at a **separate Next.js route**: `src/app/entities/[id]/page.tsx`
- Navigating to an entity triggers a **full server round-trip page load** (`router.push('/entities/110053842')`)
- The browser URL changes to `/entities/110053842` — a distinct Next.js page, not a hash state
- Deep-linking causes a cold reload, losing graph state (zoom level, visible nodes, selected node)

This means the app behaves as a **Multi-Page Application** at the routing level, contradicting the stated SPA intent.

---

## Goal

Implement **hash-based client-side routing** so that all view transitions happen within a single HTML document
(`index.html` / the root `page.tsx`) without any server-side page fetches.

| Current                                  | Target                                                  |
|------------------------------------------|---------------------------------------------------------|
| `/` → graph dashboard                    | `/#/` → graph dashboard                                 |
| `/entities/110053842` → full page reload | `/#/entities/110053842` → in-place view swap, no reload |
| Graph state lost on navigation           | Graph state preserved across view transitions           |
| Two Next.js pages                        | One Next.js page (`src/app/page.tsx`)                   |

---

## Requirements

### R1 — Hash Router Hook

Create `src/lib/useHashRouter.ts` — a custom React hook that:

- Reads the current hash (`window.location.hash`) on mount
- Listens to `hashchange` events and re-renders when the hash changes
- Exposes `{ route, navigate(path) }` where `route` is the parsed path (e.g. `"/entities/110053842"`)
- Uses `window.location.hash = '#' + path` for navigation (no Next.js router involved)
- SSR-safe: guards all `window` access with `typeof window !== 'undefined'`

### R2 — Single Root Page

`src/app/page.tsx` becomes the **only UI entry point**:

- Renders `<GraphDashboard />` when `route === '/'` or hash is empty
- Renders `<EntityDetailPage id={id} />` when `route === '/entities/:id'`
- Both views are **React components**, not Next.js pages
- Graph state (`cytoscape` instance reference, last camera position) survives the `/` ↔ `/entities/:id` transition
  by keeping `<GraphView>` mounted and hidden when not on the graph route, or using React `Suspense` + `key` prop

### R3 — Entity Detail as Component

Extract `src/app/entities/[id]/page.tsx` into a reusable component:

- Move the full entity detail JSX into `src/components/entity/EntityDetailView.tsx`
- Accept `jarKodas: string` as a prop (no `use(params)`, no Next.js page params)
- The component fetches `/api/entities/{jarKodas}` independently

### R4 — Remove Separate Next.js Page Route

- Delete `src/app/entities/[id]/page.tsx` (or replace with a redirect to `/#/entities/[id]`)
- Keeping the old route as a redirect ensures any bookmarked hard URLs still work

### R5 — Navigation Updates

All internal navigation must use the hash router:

- Sidebar "View Full Profile" button: `navigate('/entities/' + jarKodas)` (currently `router.push(...)`)
- Entity detail "Back" button: `navigate('/')` (currently `router.back()`)
- Counterparty links: `navigate('/entities/' + cp.counterpartyJar)` (currently `router.push('/?expand=...')`)
- Search result selection: update hash instead of query param

### R6 — URL Structure

| View                      | Hash URL                                                            |
|---------------------------|---------------------------------------------------------------------|
| Graph dashboard (default) | `http://localhost:3000/#/` or `http://localhost:3000/`              |
| Entity detail             | `http://localhost:3000/#/entities/110053842`                        |
| Entity detail (deep link) | Loads the SPA root, hash is parsed on mount → renders entity detail |

### R7 — Repository Structure Alignment

Per ARCHITECTURE.md §8.1, `src/app/` should contain only:

- `layout.tsx` — global shell
- `page.tsx` — **single UI entry point**
- `api/` — stateless route handlers
- `globals.css`

The `src/app/entities/` directory violates this pattern and must be removed.

---

## Out of Scope

- Query-string routing (e.g. `?view=entity&id=...`) — hash is simpler and avoids server parse
- Next.js `<Link>` component for internal navigation — not needed in a pure hash SPA
- Animated page transitions — deferred to a future story
- Nested hash routes (e.g. `#/entities/:id/contracts`) — deferred

---

## Acceptance Criteria

1. Navigating from the graph to an entity detail and back **does not trigger a full page reload**
2. The Cytoscape graph instance is **not destroyed** during entity detail navigation
3. Deep-linking to `/#/entities/110053842` renders the entity detail directly on page load
4. The `src/app/entities/[id]/` directory is removed or reduced to a redirect shell
5. All Cypress E2E tests pass (graph load, search, sidebar, entity profile navigation)
6. `npm run build` passes with zero TypeScript errors
7. `npm test` (Jest) passes — useHashRouter hook has unit tests

---

## References

- ARCHITECTURE.md §7 — System Architecture (Strictly SPA declaration)
- ARCHITECTURE.md §8.1 — Repository Structure (single `page.tsx` intent)
- ARCHITECTURE.md §15 — Use Case Implementation Details
- ENTITY_DETAILS_SPEC.md — Entity detail UI specification

---

## Next Steps

- [ ] Create `src/lib/useHashRouter.ts` — custom hash router hook with SSR guard, `route` parsing, and `navigate()`
  function
- [ ] Write Jest unit tests for `useHashRouter` in `src/lib/__tests__/useHashRouter.test.ts`
- [ ] Extract entity detail JSX into `src/components/entity/EntityDetailView.tsx` (accepts `jarKodas: string` prop, no
  Next.js page params)
- [ ] Rewrite `src/app/page.tsx` to use `useHashRouter` — render `<EntityDetailView>` or `<GraphDashboard>` based on
  `route`
- [ ] Keep `<GraphView>` mounted across route transitions (render hidden, not unmounted) to preserve Cytoscape instance
  state
- [ ] Replace all internal `router.push(...)` / `href="/entities/..."` calls with `navigate('/entities/...')` from the
  hash router
- [ ] Add `src/app/entities/[id]/page.tsx` redirect shell (renders nothing, sets `window.location.hash` then redirects
  to `/`) to handle old bookmarked URLs — or delete entirely if not needed
- [ ] Remove `src/app/entities/[id]/` directory once redirect strategy is confirmed
- [ ] Update Cypress E2E tests in `cypress/e2e/` to use hash URLs (`/#/entities/...`) instead of path URLs (
  `/entities/...`)
- [ ] Add Cypress E2E spec `cypress/e2e/entity-profile.cy.ts` testing hash navigation to entity detail and back
- [ ] Update ARCHITECTURE.md §8.1 repository structure diagram to remove `entities/[id]/` from `src/app/` and document
  the hash routing pattern
- [ ] Update ARCHITECTURE.md §7 Presentation Layer to describe the hash router as the navigation mechanism
- [ ] Run `npm run lint` — resolve any ESLint issues in new/modified files
- [ ] Run `npm run build` — confirm zero TypeScript errors
- [ ] Run `npm test` — confirm all Jest tests pass (including new `useHashRouter` tests)
- [ ] Run `npm run cypress:run` (with dev server running) — confirm all Cypress specs pass
- [ ] Mark all checkboxes as done in this document once verified
