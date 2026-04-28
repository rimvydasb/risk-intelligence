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
| ---------------------------- | ------------------------------- |
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
| ------ | --------------------------------- | --------------------------------------- |
| `GET`  | `/api/v1/healthcheck`             | DB status + staging table counts        |
| `GET`  | `/api/v1/graph/expand/[jarKodas]` | Fetch & expand org node (nodes + edges) |
| `GET`  | `/api/v1/entity/[entityId]`       | Full entity profile                     |

## Docs

- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — full system design
- [`docs/BACKEND_REST_API_STORY.md`](../docs/BACKEND_REST_API_STORY.md) — backend story (✅ complete)
- [`docs/GRAPH_VISUALIZATION_STORY.md`](../docs/GRAPH_VISUALIZATION_STORY.md) — frontend story (✅ complete)
- [`docs/USE_CASES.md`](../docs/USE_CASES.md) — product use cases

## Efficiency Rules (lessons learned)

### Validate external API response shapes before writing types
When integrating a new external API, fetch a **real live response** and inspect its shape before writing TypeScript types
or parsers. Example trap: the `viespirkiai.org/mcp` pinreg endpoint returns an array of raw declaration objects, not the
aggregated object shape assumed from the example file. Writing types from the example file and only discovering the
mismatch at runtime cost multiple back-and-forth iterations.
- **Rule**: `curl` the real endpoint first, pretty-print with `python3 -m json.tool`, verify top-level type (array vs
  object) and field names before writing any types or parsers.

### Query the DB directly when debugging parser/cache bugs
When elements are missing from the UI, skip the browser and go straight to the DB:
```sql
docker compose exec postgres psql -U postgres -d risk_intelligence \
  -c 'SELECT jsonb_typeof(data) FROM "StagingPinreg" WHERE vardas = ''NAME'';'
```
If `jsonb_typeof` returns `array` but your parser expects `object`, the cache format is wrong. Check this in one query
before doing UI debugging.

### Use `docker compose exec postgres psql` for DB inspection
`psql` is not in PATH locally; always use `docker compose exec postgres psql -U postgres -d risk_intelligence`.
Prisma Client cannot be run via `node -e` (requires constructor args); use `npx prisma studio` or raw SQL instead.

### Start dev server once per session in a background node process
Running `npm run dev &` in a bash session and then trying to `curl` in the same session fails because the background
process is killed when the session exits. Instead, wrap the server + test in a single `node -e` script that spawns the
server as a child process, polls until ready, then runs the test — all in one bash call.

### Always wire toolbar search (`onNodeSelect`) alongside canvas clicks
Any state set inside `handleNodeClick` must also be set in the `onNodeSelect` toolbar callback in `GraphView.tsx`.
These are two independent entry points for node selection; forgetting one means toolbar-searched nodes behave
differently from canvas-clicked nodes.
