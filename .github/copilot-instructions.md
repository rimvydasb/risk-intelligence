# Copilot Instructions — Risk Intelligence

[ARCHITECTURE.md](../docs/ARCHITECTURE.md)
[DEVELOPMENT_PLAN.md](../docs/DEVELOPMENT_PLAN.md)

## Commands

```bash
# Local environment
docker-compose up -d          # Start PostgreSQL
npm run db:setup               # Init schema + seed real data
npm run db:synthesize          # Add ~1,000 synthetic entities

# Dev
npm run dev                    # Next.js dev server (http://localhost:3000)
npm run build                  # Production build
npm run lint                   # ESLint (src/ only)

# Testing
npm test                       # Run all Jest unit tests
npm test -- --testPathPattern=GraphView   # Run a single test file
npm run test:coverage          # Jest with coverage
npm run cypress:run            # Cypress E2E (requires running dev server)
```

> Cypress requires the dev server running at `http://localhost:3000` before `cypress:run`.

---

## Architecture

This is a **Single-Page Application** built with Next.js App Router — **no Server Components for data fetching**. All pages and UI components must have `'use client'` at the top.

### Data flow

```
PostgreSQL (Docker)
  └── Prisma ORM
        └── Route Handlers (src/app/api/)
              └── Client Components (fetch() calls)
                    └── Cytoscape.js (graph canvas)
```

- **`src/app/api/`** — Stateless Next.js Route Handlers. Each instantiates its own `PrismaClient`. Dynamic route params are `Promise<{ id: string }>` and must be `await`ed.
- **`src/lib/risk-engine.ts`** — `RiskEngine` class: risk scoring (`displayScore = log2(riskScore + 1) * 10`), shell company detection, and multi-hop network traversal via raw SQL recursive CTEs (Prisma's fluent API doesn't support `WITH RECURSIVE`).
- **`src/lib/entity-resolver.ts`** — `EntityResolver` class: Lithuanian name normalization (strips gendered suffixes `-as/-is/-us`) + Metaphone phonetic hash to generate deterministic `Person.uid` values.
- **`src/components/GraphView.tsx`** — Cytoscape.js canvas. Lazily imports `cytoscape` and `cytoscape-fcose` via dynamic `import()` inside `useEffect` to avoid SSR issues. Exposes `data-testid="graph-container"`.
- **`src/app/page.tsx`** — Main dashboard: full-viewport graph with a floating search bar and slide-out sidebar for node details.
- **`src/app/entities/[id]/page.tsx`** — 360° entity profile page.

### Initial graph anchor

The dashboard loads an initial graph anchored at company `110053842` (AB "Lietuvos geležinkeliai"). See `src/app/api/entities/initial/route.ts`.

---

## Data Model

Primary keys are domain-specific, not UUIDs:
- `Company.jarKodas` — Lithuanian company registry code (string)
- `Person.uid` — Synthetic hash: `H(Metaphone(normalized_name))`
- `Contract.contractId` — viespirkiai.org contract ID

Graph edges are `PersonRelationship` (person ↔ company with a `role`: `"owner"`, `"ceo"`, `"ubo"`) and `Contract` (supplier company → buyer institution).

---

## Key Conventions

### Code style
- **4-space indentation** in all `.ts` / `.tsx` files
- **120-character** max line length
- Path alias `@/*` maps to `src/*`

### Testing
- **Jest** (`src/**/__tests__/*.test.ts`) — unit tests for business logic only, no GUI assertions.
- **Cypress** (`cypress/e2e/*.cy.ts`) — all UI interaction and graph rendering tests.
- Cytoscape **must be mocked** in Jest (it requires real DOM dimensions):
  ```ts
  jest.mock('cytoscape', () => ({ __esModule: true, default: jest.fn(() => ({ destroy: jest.fn() })) }));
  ```
- Use `data-testid="graph-container"` as the stable selector in Cypress tests.

### API routes
- Always `await params` before accessing its properties:
  ```ts
  const { id } = (await params);   // params: Promise<{ id: string }>
  ```
- Return `NextResponse.json({ error: '...' }, { status: 500 })` on errors; log with `console.error`.

### Risk scoring
- Raw risk scores are additive integers. Convert to display scores with `RiskEngine.calculateDisplayScore(score)` before persisting.
- Risk is recalculated via `RiskEngine.updateCompanyRisk(jarKodas)` — **Calculation on Write** pattern.

### Cytoscape element shape
Nodes require `data.type` (`"company"` | `"person"` | `"buyer"`) and `data.risk` (display score) for correct styling. Edges use `data.source`, `data.target`, and `data.label`.
