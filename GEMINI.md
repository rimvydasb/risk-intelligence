# Risk Intelligence Project Context

This project is a Risk Intelligence GUI designed for fraud detection and money laundering analysis, specifically
focusing on Lithuanian public procurement data. It leverages graph analysis to identify suspicious patterns such as bid
rigging, shell companies, and conflicts of interest.

## Project Overview

- **Purpose:** Provide a visual and analytical tool for detecting financial crimes in public procurement.
- **Core Typologies:**
    - **Bid Rigging / Cartel Detection:** Identifying artificial competition.
    - **Shell Company / Fronting Detection:** Spotting entities with high contract values but low substance.
    - **PEP / Conflict of Interest:** Linking decision-makers to winning suppliers.
- **Data Foundation:** Aggregated Lithuanian government data from [viespirkiai.org](https://viespirkiai.org) (CC BY
  4.0).
- **Architecture:** Single-Root Modular Monolith (Next.js as SPA + Stateless Node API).
- **Environment Parity:** Docker Compose for PostgreSQL only; Host Node.js for application runtime.

## Technology Stack

- **Frontend:** Next.js 16 (App Router as SPA), React 19, TypeScript.
- **UI Components:** Material UI (MUI) v5 with Emotion.
- **Graph Visualization:** Cytoscape.js (Lazy Loading).
- **Database:** Supabase (PostgreSQL) with Prisma ORM.
- **Search:** Supabase Full-Text Search (pg_trgm).
- **Ingestion:** GitHub Actions (Node.js Stateful ETL).

## Building and Running

### Key Commands

- `docker-compose up -d`: Starts the local PostgreSQL database.
- `npm run dev`: Starts the Next.js development server on the host.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.

## Development Conventions

### Coding Standards

- **Indentation:** Use **4 spaces** for all code files (TSX, TS, CSS, etc.).
- **Line Length:** Maximum **120 characters**.
- **Naming:** Use descriptive names for variables, functions, and classes. Avoid abbreviations.

### Architecture & Patterns

- **App Router:** All pages, layouts, and API routes are located in `src/app`.
- **SPA Enforcement:** Use `'use client'` at the top of all UI entry points. No Server Components for data fetching.
- **SAD Document:** Refer to `ARCHITECTURE.md` for the detailed system and architecture design.

### Testing Practices

- **Unit Tests:** Located alongside components in `__tests__` directories (e.g., `src/components/__tests__/GraphView.test.tsx`).
- **Setup:** Global test setup is handled in `jest.setup.ts`.

## Key Files

- `package.json`: SINGLE ROOT dependencies and scripts.
- `ARCHITECTURE.md`: The primary source of truth for architecture and implementation plans.
- `src/app/layout.tsx`: The global shell and providers.
- `src/app/page.tsx`: The main dashboard entry point (Client Component).
- `src/app/api/`: Stateless Route Handlers.
- `docker-compose.yml`: Local PostgreSQL configuration.

- `jest.config.ts`: Jest configuration.
