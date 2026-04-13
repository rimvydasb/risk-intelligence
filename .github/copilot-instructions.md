# Copilot Instructions — Risk Intelligence

[ARCHITECTURE.md](../docs/ARCHITECTURE.md)

## Project

Risk Intelligence System — visualises Lithuanian public procurement data as an interactive Cytoscape.js graph to detect
nepotism, conflict-of-interest, and bid-rigging.

- **Next.js 16** (App Router, hash-based routing, no SSR for UI) + **React 19**
- **Cytoscape.js 3** for graph rendering
- **Material UI v9** + Emotion
- **Prisma 5** + **PostgreSQL 16** (Docker in dev, Supabase in prod)
- **TanStack React Query** for data fetching / caching
- **Jest 30** (unit + integration) · **Cypress** (E2E)

## Commands

| Task                         | Command                         |
|------------------------------|---------------------------------|
| Dev server                   | `npm run dev`                   |
| Production build             | `npm run build`                 |
| Lint                         | `npm run lint`                  |
| Unit tests                   | `npm test`                      |
| Full API + integration tests | `./bin/run-api-tests.sh`        |
| E2E tests (Cypress)          | `./bin/run-cypress-tests.sh`    |
| Seed dev database            | `npm run db:seed`               |
| Start dev DB                 | `docker compose up -d postgres` |
| Prisma migrations            | `npx prisma migrate dev`        |

## Key Conventions

- **Hash routing** — all client navigation uses `#/path`. `useHashRouter` hook provides `navigate()` / `replace()`. No
  Next.js `<Link>` or `useRouter` in UI components.
- **Entity ID prefixes** — `org:`, `person:`, `contract:`, `tender:` prefix all entity IDs. Bare jarKodas (5-10 digits)
  must be normalised to `org:<id>` before API calls.
- **Two-layer storage** — raw viespirkiai JSON cached in `StagingAsmuo / StagingSutartis / StagingPirkimas` (TTL 24 h).
  Parsed on-the-fly into Cytoscape elements — no separate entity/relationship tables.
- **Module structure** — each `src/lib/*` module contains `types.ts`, implementation files, and a `__tests__/` folder.
  Same pattern for `src/components/`.
- **No SSR for UI components** — `CytoscapeCanvas` is dynamically imported with `{ ssr: false }`. Cytoscape uses a
  runtime `require()` guard.
- **MUI v9** — use `slotProps` instead of deprecated `inputProps`. Typography props like `fontWeight` go in `sx`.
- **Test environments** — unit tests use jsdom (default). Integration tests require `RUN_INTEGRATION=true` and a running
  test DB (handled by `run-api-tests.sh`). `.env.test` points to port 5433 test container.

## REST API

| Method | Path                              | Description                             |
|--------|-----------------------------------|-----------------------------------------|
| `GET`  | `/api/v1/healthcheck`             | DB status + staging table counts        |
| `GET`  | `/api/v1/graph/expand/[jarKodas]` | Fetch & expand org node (nodes + edges) |
| `GET`  | `/api/v1/entity/[entityId]`       | Full entity profile                     |

## Docs

- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — full system design
- [`docs/BACKEND_REST_API_STORY.md`](../docs/BACKEND_REST_API_STORY.md) — backend story (✅ complete)
- [`docs/GRAPH_VISUALIZATION_STORY.md`](../docs/GRAPH_VISUALIZATION_STORY.md) — frontend story (✅ complete)
- [`docs/USE_CASES.md`](../docs/USE_CASES.md) — product use cases
