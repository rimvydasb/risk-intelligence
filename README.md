# Risk Intelligence System

> Visualise Lithuanian public procurement relationships as an interactive graph — detect nepotism, conflict-of-interest, and bid-rigging patterns at a glance.

Data is sourced from [viespirkiai.org](https://viespirkiai.org) and rendered with [Cytoscape.js](https://js.cytoscape.org/).

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [Docs](#docs)

---

## Overview

The system builds a live graph of:

- **Companies** (public, private, institutions) connected by procurement **contracts**
- **People** (employees, board members, family members) connected to companies via employment/role edges
- **Tenders** as expandable nodes

Clicking a node fetches fresh data from viespirkiai.org, caches it in PostgreSQL staging tables, and expands the graph in place — no page reloads.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Graph | Cytoscape.js 3 + cytoscape-fcose layout |
| UI | Material UI v9 + Emotion |
| ORM | Prisma 5 + PostgreSQL 16 |
| HTTP client | Axios (viespirkiai.org API) |
| Unit tests | Jest 30 (jsdom) |
| Integration tests | Jest 30 (node) + real PostgreSQL test DB |
| E2E tests | Cypress |
| Language | TypeScript 6 |

---

## Project Structure

```
src/
├── app/
│   └── api/v1/
│       ├── graph/expand/[jarKodas]/   # GET — expand org node
│       └── entity/[entityId]/         # GET — entity detail
├── components/                        # React UI components
├── lib/
│   ├── db.ts                          # Prisma singleton
│   ├── viespirkiai/                   # HTTP client + raw types
│   ├── staging/                       # PostgreSQL cache layer (TTL-based)
│   ├── parsers/                       # Raw JSON → Cytoscape elements
│   └── graph/                        # Orchestration (expand + entity detail)
└── types/
    └── graph.ts                       # Shared Cytoscape TS interfaces

prisma/
└── schema.prisma                      # StagingAsmuo, StagingSutartis, StagingPirkimas

docs/
├── ARCHITECTURE.md                    # Full system design
├── BACKEND_REST_API_STORY.md          # Backend implementation story
└── USE_CASES.md                       # Product use cases

bin/
└── run-api-tests.sh                   # Integration test runner (starts test DB)
```

Each `src/lib/*` module follows the convention:
```
module/
├── types.ts          # Module-local types
├── *.ts              # Implementation
└── __tests__/        # Jest tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development database

```bash
docker compose up -d postgres
```

### 3. Set up environment

```bash
cp .env.example .env   # then fill in DATABASE_URL
```

The default dev database URL is:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/risk_intelligence"
```

### 4. Run Prisma migrations

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Unit tests (Jest, jsdom) |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run cypress:run` | Cypress E2E tests |
| `./bin/run-api-tests.sh` | **Full test suite** — starts test DB, migrates, runs all Jest tests including integration |

---

## Testing

### Unit tests (default)

```bash
npm test
```

Runs parser and viespirkiai client tests. No database required.

### Integration + unit tests (full suite)

```bash
./bin/run-api-tests.sh
```

This script:
1. Starts `postgres-test` Docker container (port 5433, tmpfs — wiped each run)
2. Runs `prisma migrate deploy` against the test DB
3. Runs all Jest tests with `RUN_INTEGRATION=true` (unlocks staging, graph, and route handler tests)
4. Stops the test container on exit

### Environment

Integration tests use `.env.test`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/risk_intelligence_test"
```

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design including:
- Entity ID conventions
- Data-to-entity mapping (viespirkiai.org → Cytoscape nodes/edges)
- Staging storage population flow
- REST API contract
- Delivery phases

---

## Docs

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data model, API design |
| [`docs/BACKEND_REST_API_STORY.md`](docs/BACKEND_REST_API_STORY.md) | Backend implementation story with acceptance criteria |
| [`docs/USE_CASES.md`](docs/USE_CASES.md) | Product use cases and future roadmap |
