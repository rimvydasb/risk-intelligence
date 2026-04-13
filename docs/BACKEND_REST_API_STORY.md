# Story: Backend REST API

## Summary

Implement the complete backend for the Risk Intelligence System: Prisma schema, database setup,
viespirkiai.org HTTP client, staging cache layer, in-memory parsers, and Next.js API route handlers.
All REST endpoints must be covered by Jest integration tests that run against a real PostgreSQL
test database using `docs/examples/` as fixture data. A `bin/run-api-tests.sh` shell script
(modelled on `bin/run-cypress-tests.sh`) provides a one-command way to spin up the test database,
seed fixtures, run the tests, and tear down.

---

## Context

The graph is populated lazily: the user opens the app → the app calls
`GET /api/v1/graph/expand/{jarKodas}` → the route handler checks the staging cache → fetches from
viespirkiai.org if stale/missing → parses the raw JSON in-memory → returns Cytoscape.js-compatible
elements. There are no intermediate Entity/Relationship database tables in v1.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full data model, staging schema, and API
response format.

---

## Acceptance Criteria

1. `prisma/schema.prisma` is complete with `StagingAsmuo`, `StagingSutartis`, `StagingPirkimas`.
2. `GET /api/v1/graph/expand/[jarKodas]` returns valid Cytoscape elements for a known org code.
3. `GET /api/v1/entity/[entityId]` returns a 360° detail payload for a known entity ID.
4. Responses are structurally correct: `{ elements: { nodes, edges }, meta }` for expand;
   `{ id, type, label, data, relationships }` for entity.
5. Staging cache TTL is respected: a fresh staging row is not re-fetched from viespirkiai.org.
6. A stale / missing staging row triggers a viespirkiai.org fetch, stores the result, then parses.
7. All parsers correctly derive `OrganizationEntity`, `PersonEntity`, `TenderEntity`, and
   `Relationship` from the sample fixtures in `docs/examples/`.
8. All Jest tests pass with `NODE_ENV=test` and `.env.test` credentials.
9. `bin/run-api-tests.sh` runs end-to-end (Docker DB up → migrate → seed → test → exit).
10. `npm run lint` and `npm test` both pass on `main`.

---

## Technical Breakdown

### 1. Environment & Docker

**`.env.test`**

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/risk_intelligence_test"
VIESPIRKIAI_BASE_URL="https://viespirkiai.org"
STAGING_TTL_ASMUO_HOURS=24
STAGING_TTL_SUTARTIS_HOURS=168
STAGING_TTL_PIRKIMAS_HOURS=24
```

**`docker-compose.yml`** — add a dedicated `postgres-test` service alongside the existing `postgres`
so developers can run both databases simultaneously without conflicts:

```yaml
postgres-test:
  image: postgres:16-alpine
  container_name: risk-intelligence-db-test
  environment:
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=postgres
    - POSTGRES_DB=risk_intelligence_test
  ports:
    - "5433:5432"        # different host port — no clash with dev DB on 5432
  tmpfs:
    - /var/lib/postgresql/data   # in-memory; wiped on container stop
```

---

### 2. Prisma Schema

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model StagingAsmuo {
  jarKodas  String   @id
  data      Json     
  fetchedAt DateTime @default(now()) @updatedAt
}

model StagingSutartis {
  sutartiesUnikalusID String   @id
  data                Json     
  fetchedAt           DateTime @default(now()) @updatedAt
}

model StagingPirkimas {
  pirkimoId String   @id
  data      Json     
  fetchedAt DateTime @default(now()) @updatedAt
}
```

---

### 3. Module Structure

Every `src/lib` module follows the same internal convention:

```
src/lib/{module}/
├── types.ts          # All TypeScript interfaces owned by this module
├── *.ts              # Implementation files (one concern per file)
└── __tests__/        # Jest tests colocated with the module they test
    └── *.test.ts
```

The route handlers in `src/app/api/` are thin — they delegate all business logic to `src/lib`.

```
src/
├── types/
│   └── graph.ts                              # Shared interfaces used by both frontend and backend:
│                                             # TemporalEntity, OrganizationEntity, PersonEntity,
│                                             # TenderEntity, Relationship, CytoscapeResponse
├── lib/
│   ├── db.ts                                 # Prisma singleton (no module wrapper needed)
│   │
│   ├── viespirkiai/                          # Raw HTTP layer — viespirkiai.org API
│   │   ├── types.ts                          # AsmuoRaw, SutartisRaw, PirkamasRaw, ViespirkiaiError
│   │   ├── client.ts                         # fetchAsmuo, fetchSutartis, fetchPirkimas
│   │   └── __tests__/
│   │       └── client.test.ts                # Unit: mocked axios, error shapes, base URL config
│   │
│   ├── staging/                              # PostgreSQL cache — stores raw API responses
│   │   ├── types.ts                          # CacheEntry<T>, TTLConfig, isFresh(entry, ttl): bool
│   │   ├── asmuo.ts                          # getAsmuo(jarKodas), upsertAsmuo(jarKodas, data)
│   │   ├── sutartis.ts                       # getSutartis(id), upsertSutartis(id, data)
│   │   ├── pirkimas.ts                       # getPirkimas(id), upsertPirkimas(id, data)
│   │   └── __tests__/
│   │       ├── asmuo.test.ts                 # Integration: real test DB, TTL fresh/stale/missing
│   │       ├── sutartis.test.ts
│   │       └── pirkimas.test.ts
│   │
│   ├── parsers/                              # In-memory JSON → Cytoscape elements
│   │   ├── types.ts                          # CytoscapeNode, CytoscapeEdge, CytoscapeElements,
│   │   │                                     # FilterParams (yearFrom, yearTo, minValue)
│   │   ├── asmuo.ts                          # parseAsmuo(raw, filters?) → CytoscapeElements
│   │   │                                     # (core parser — see mapping table below)
│   │   ├── sutartis.ts                       # parseSutartis(raw) → { nodes, edges }
│   │   ├── pirkimas.ts                       # parsePirkimas(raw) → TenderEntity node
│   │   └── __tests__/
│   │       ├── asmuo.test.ts                 # Unit: fixture 110053842 (rich), fixture 307562016 (empty pinreg)
│   │       ├── sutartis.test.ts              # Unit: fixture 2008059225
│   │       └── pirkimas.test.ts              # Unit: fixture 7346201
│   │
│   └── graph/                                # Orchestration — ties staging + parsers together
│       ├── types.ts                          # ExpandResult, EntityDetailResult, GraphFilters
│       ├── expand.ts                         # expandOrg(jarKodas, filters) → ExpandResult
│       │                                     # 1. staging.getAsmuo → 2. viespirkiai.fetchAsmuo if stale
│       │                                     # 3. staging.upsertAsmuo → 4. parsers.parseAsmuo → return
│       ├── entity.ts                         # getEntityDetail(entityId) → EntityDetailResult
│       │                                     # Read staging cache → build 360° profile
│       └── __tests__/
│           ├── expand.test.ts                # Integration: test DB + mocked viespirkiai HTTP
│           └── entity.test.ts
│
└── app/
    └── api/
        └── v1/
            ├── graph/
            │   └── expand/
            │       └── [jarKodas]/
            │           └── route.ts          # Thin handler: parse req → graph.expandOrg → NextResponse
            └── entity/
                └── [entityId]/
                    └── route.ts              # Thin handler: parse req → graph.getEntityDetail → NextResponse
```

---

### 4. Core Implementations

#### `src/lib/db.ts` — Prisma Singleton

```typescript
import {PrismaClient} from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

#### `src/lib/viespirkiai/client.ts` — HTTP Client

Typed wrapper around `axios`. Base URL from `VIESPIRKIAI_BASE_URL` env var. Throws `ViespirkiaiError`
(defined in `types.ts`) on non-2xx so callers can distinguish upstream failures from local errors.

```typescript
export async function fetchAsmuo(jarKodas: string): Promise<AsmuoRaw>

export async function fetchSutartis(id: string): Promise<SutartisRaw>

export async function fetchPirkimas(id: string): Promise<PirkamasRaw>
```

#### `src/lib/staging/types.ts` — TTL helper

```typescript
export interface CacheEntry<T> {
    key: string;
    data: T;
    fetchedAt: Date
}

export function isFresh(entry: CacheEntry<unknown>, ttlHours: number): boolean
```

#### `src/lib/parsers/asmuo.ts` — Core Parser

Transforms raw `asmuo` JSON into Cytoscape elements. Pure function — no I/O.

| Source field                      | Produces                                                      |
|-----------------------------------|---------------------------------------------------------------|
| `jar`                             | Org node (`expanded: true`)                                   |
| `sodra`                           | enriches Org node (`employees`, `avgSalary`)                  |
| `pinreg.darbovietes[]`            | Person node + Director / Employment / Official edge → Org     |
| `pinreg.sutuoktinioDarbovietes[]` | Person node × 2 + Spouse edge + Employment edge               |
| `pinreg.rysiaiSuJa[]`             | Person node + Director / Shareholder / Official edge → Org    |
| `sutartys.topPirkejai[]`          | Stub Org node (`expanded: false`) + Contract edge (aggregate) |
| `sutartys.topTiekejai[]`          | Stub Org node (`expanded: false`) + Contract edge (aggregate) |

Edge IDs are deterministic: `edge:{source}-{target}-{type}[-{qualifier}]`

#### `src/lib/graph/expand.ts` — Orchestrator

```typescript
export async function expandOrg(jarKodas: string, filters?: GraphFilters): Promise<ExpandResult>
```

Sequence: `getAsmuo(jarKodas)` → if stale/null: `fetchAsmuo` → `upsertAsmuo` → `parseAsmuo(raw, filters)` → return.

#### Route Handlers (thin wrappers)

`GET /api/v1/graph/expand/[jarKodas]`:

```
1. Validate jarKodas (numeric) → 400 on fail
2. expandOrg(jarKodas, filters) → 200 { elements, meta }
3. Catch ViespirkiaiError → 502; catch Error → 500
```

`GET /api/v1/entity/[entityId]`:

```
1. Validate entityId prefix (org: | person: | tender:) → 400 on fail
2. getEntityDetail(entityId) → 200 { id, type, label, data, relationships }
3. null result → 404
```

---

### 5. Test Matrix

#### `src/lib/viespirkiai/__tests__/client.test.ts` (unit — mocked axios)

| # | Scenario                     | Expected                                |
|---|------------------------------|-----------------------------------------|
| 1 | fetchAsmuo — 200 OK          | Returns typed AsmuoRaw                  |
| 2 | fetchAsmuo — 404             | Throws ViespirkiaiError with status 404 |
| 3 | fetchAsmuo — network timeout | Throws ViespirkiaiError                 |
| 4 | Base URL from env var        | axios called with correct URL           |

#### `src/lib/staging/__tests__/*.test.ts` (integration — real test DB)

| # | Scenario                               | Expected               |
|---|----------------------------------------|------------------------|
| 1 | getAsmuo — no row                      | Returns null           |
| 2 | upsertAsmuo then getAsmuo — fresh      | Returns data           |
| 3 | upsertAsmuo with old fetchedAt — stale | Returns null           |
| 4 | upsertAsmuo twice — idempotent         | No duplicate key error |

#### `src/lib/parsers/__tests__/*.test.ts` (unit — fixture JSON)

| # | Scenario                     | Expected                                                                 |
|---|------------------------------|--------------------------------------------------------------------------|
| 1 | parseAsmuo(110053842)        | anchor Org node `expanded: true`, ≥1 Person, Director + Employment edges |
| 2 | parseAsmuo(307562016)        | anchor Org node only — no Person nodes (empty pinreg)                    |
| 3 | parseAsmuo — topPirkejai     | stub Org nodes `expanded: false`, Contract edges with totalValue         |
| 4 | parseAsmuo — yearFrom filter | edges before yearFrom excluded                                           |
| 5 | parseAsmuo — minValue filter | contract edges below threshold excluded                                  |
| 6 | parseSutartis(2008059225)    | buyer + supplier Org nodes, Contract edge with verte                     |
| 7 | parsePirkimas(7346201)       | TenderEntity node, procuring Org node                                    |

#### `src/lib/graph/__tests__/expand.test.ts` (integration — test DB + mocked viespirkiai)

| # | Scenario                        | Expected                                        |
|---|---------------------------------|-------------------------------------------------|
| 1 | Cache miss → mock fetch → parse | ExpandResult with elements, staging row written |
| 2 | Cache hit (fresh)               | ExpandResult returned, viespirkiai NOT called   |
| 3 | Cache stale                     | viespirkiai called once, cache refreshed        |
| 4 | viespirkiai 404                 | Throws ViespirkiaiError                         |

#### `src/lib/graph/__tests__/entity.test.ts` (integration — test DB)

| # | Scenario               | Expected                                 |
|---|------------------------|------------------------------------------|
| 1 | org: prefix, cached    | EntityDetailResult with full org profile |
| 2 | person: prefix, cached | EntityDetailResult with person profile   |
| 3 | Entity not in cache    | Returns null                             |

#### Route handler tests (HTTP level — Next.js test client)

| # | Endpoint | Scenario                     | Expected                  |
|---|----------|------------------------------|---------------------------|
| 1 | expand   | Valid jarKodas, cache seeded | 200, `{ elements, meta }` |
| 2 | expand   | Non-numeric jarKodas         | 400                       |
| 3 | expand   | viespirkiai mock → 404       | 502                       |
| 4 | entity   | Valid org: entityId, cached  | 200, entity payload       |
| 5 | entity   | Unknown entityId prefix      | 400                       |
| 6 | entity   | Valid prefix, not in cache   | 404                       |

---

### 6. `bin/run-api-tests.sh`

Modelled on `bin/run-cypress-tests.sh`. One command for CI and local development.

```bash
#!/bin/bash
set -e

DB_CONTAINER="risk-intelligence-db-test"
DB_PORT=5433

# 1. Start test database
docker compose up -d postgres-test

# 2. Wait for postgres to accept connections
count=0
until docker exec $DB_CONTAINER pg_isready -U postgres > /dev/null 2>&1; do
  if [ $count -ge 30 ]; then echo "Timeout waiting for test DB"; exit 1; fi
  echo "Waiting for test DB... ($count/30)"
  sleep 1
  ((count++))
done

cleanup() {
  echo "Stopping test DB..."
  docker compose stop postgres-test
}
trap cleanup EXIT

# 3. Apply migrations against test DB
dotenv -e .env.test -- npx prisma migrate deploy

# 4. Run Jest (all lib + api tests) with test environment
dotenv -e .env.test -- npx jest --testPathPattern="src/(lib|app/api)" --runInBand --forceExit "$@"
```

---

## Delivery Phases

Each phase ends with a **verified, testable business capability**. Later phases build on earlier ones.

---

### Phase 1 — Foundation: DB Accessible & Schema Migrated

> **Testable:** `./bin/run-api-tests.sh` exits 0. All three staging tables exist in the test DB.

- [x] Add `postgres-test` service to `docker-compose.yml` (port 5433, tmpfs storage)
- [x] Create `.env.test` and add it to `.gitignore`
- [x] Write `prisma/schema.prisma` with `StagingAsmuo`, `StagingSutartis`, `StagingPirkimas`
- [x] Run `npx prisma migrate dev --name init` to generate migration
- [x] Implement `src/lib/db.ts` — Prisma singleton
- [x] Create `bin/run-api-tests.sh` — start DB, migrate, run Jest (no test files yet → passes trivially)

---

### Phase 2 — viespirkiai HTTP Client: Raw Data Fetched and Typed

> **Testable:** `npm test -- --testPathPattern="src/lib/viespirkiai"` passes.
> Developer can call `fetchAsmuo('110053842')` and receive a typed `AsmuoRaw` object.

- [x] Implement `src/lib/viespirkiai/types.ts` — `AsmuoRaw`, `SutartisRaw`, `PirkamasRaw`, `ViespirkiaiError`
- [x] Implement `src/lib/viespirkiai/client.ts` — `fetchAsmuo`, `fetchSutartis`, `fetchPirkimas`
- [x] Write `src/lib/viespirkiai/__tests__/client.test.ts` — 4 unit tests (mocked axios)

---

### Phase 3 — Staging Cache: Responses Cached with TTL

> **Testable:** `npm test -- --testPathPattern="src/lib/staging"` passes.
> Cache correctly returns `null` for missing/stale rows and returns data for fresh rows.

- [x] Implement `src/lib/staging/types.ts` — `CacheEntry<T>`, `isFresh()` helper
- [x] Implement `src/lib/staging/asmuo.ts`, `sutartis.ts`, `pirkimas.ts`
- [x] Write `src/lib/staging/__tests__/asmuo.test.ts`, `sutartis.test.ts`, `pirkimas.test.ts` — 4 tests each (real test
  DB)

---

### Phase 4 — Parsers: JSON → Graph Entities

> **Testable:** `npm test -- --testPathPattern="src/lib/parsers"` passes.
> `parseAsmuo` on `110053842.json` produces the correct nodes and edge types.
> Empty `pinreg` in `307562016.json` produces only the anchor org node.

- [x] Implement `src/types/graph.ts` — shared interfaces (`TemporalEntity`, `OrganizationEntity`,
  `PersonEntity`, `TenderEntity`, `Relationship`, `CytoscapeResponse`)
- [x] Implement `src/lib/parsers/types.ts` — `CytoscapeNode`, `CytoscapeEdge`, `CytoscapeElements`, `FilterParams`
- [x] Implement `src/lib/parsers/asmuo.ts` — core parser (all mapping rules)
- [x] Implement `src/lib/parsers/sutartis.ts` — Contract edge parser
- [x] Implement `src/lib/parsers/pirkimas.ts` — TenderEntity parser
- [x] Write `src/lib/parsers/__tests__/asmuo.test.ts` — 5 unit tests
- [x] Write `src/lib/parsers/__tests__/sutartis.test.ts` — 1 unit test
- [x] Write `src/lib/parsers/__tests__/pirkimas.test.ts` — 1 unit test

---

### Phase 5 — Graph Orchestration: Full Expand Pipeline

> **Testable:** `npm test -- --testPathPattern="src/lib/graph"` passes.
> `expandOrg('110053842')` returns a valid `ExpandResult` with Cytoscape elements.
> Filters (yearFrom, minValue) are applied correctly. Cache is populated on first call.

- [x] Implement `src/lib/graph/types.ts` — `ExpandResult`, `EntityDetailResult`, `GraphFilters`
- [x] Implement `src/lib/graph/expand.ts` — orchestrator (staging → fetch if stale → parse → filter)
- [x] Implement `src/lib/graph/entity.ts` — 360° entity detail builder
- [x] Write `src/lib/graph/__tests__/expand.test.ts` — 4 integration tests (test DB + mocked viespirkiai)
- [x] Write `src/lib/graph/__tests__/entity.test.ts` — 3 integration tests

---

### Phase 6 — REST Endpoints: HTTP API Live and Tested

> **Testable:** `./bin/run-api-tests.sh` passes all tests.
> `curl http://localhost:3000/api/v1/graph/expand/110053842` returns valid Cytoscape JSON.
> HTTP error codes (400, 404, 502, 500) are correct in all edge cases.

- [x] Implement `src/app/api/v1/graph/expand/[jarKodas]/route.ts` — thin handler delegating to `graph.expandOrg`
- [x] Implement `src/app/api/v1/entity/[entityId]/route.ts` — thin handler delegating to `graph.getEntityDetail`
- [x] Write route handler tests — 6 HTTP-level tests
- [x] Verify `bin/run-api-tests.sh` end-to-end (DB up → migrate → all tests → DB stop)
- [ ] Run `npm run lint` — zero errors ⚠️ pre-existing ESLint 10 / `eslint-config-next` incompatibility (`contextOrFilename.getFilename`); not introduced by this story
- [x] Run `npm test` — all tests pass (51 tests across 11 suites)
