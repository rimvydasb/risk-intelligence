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
- **Architecture:** Single-Root Modular Monolith (Next.js SPA + Stateless Node API).
- **Strategy:** Local-First Proof-of-Concept (POC) with synthetic data generation. Cloud deployment is deferred.

## Technology Stack

- **Frontend:** Next.js 16 (App Router as SPA), React 19, TypeScript.
- **UI Components:** MUI v5 with Emotion.
- **Graph Visualization:** Cytoscape.js (Lazy Loading).
- **Database:** PostgreSQL (Local Docker) / Supabase (Future Target).
- **ORM:** Prisma.
- **Synthesis:** Custom Node.js Synthesizer (Faker-based) for local dataset expansion.

## POC Workflow: Building the Local Sandbox

### Key Commands (Active Development)

1. `docker-compose up -d`: Starts the local PostgreSQL database.
2. `npm run db:setup`: Initializes the schema and seeds the two real data samples.
3. `npm run db:synthesize`: Expands the database with ~1,000 synthetic entities for testing.
4. `npm run dev`: Starts the Next.js development server on the host.

### Deferred Automation (Future State)
- **GitHub Actions:** Nightly ETL runner is documented but not active.
- **Vercel/Supabase:** Cloud targets are configured but not currently used for deployment.


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

- **Unit Tests (Jest):** Focused on business logic, risk scoring algorithms, and data utilities. No GUI testing.
- **E2E & GUI Tests (Cypress):** Mandatory for verifying UI interactions, Cytoscape.js rendering, and 360-view navigation.
- **Test Locations:**
    - Jest: `src/**/__tests__/*.test.ts` (Logic and Services).
    - Cypress: `cypress/e2e/*.cy.ts` (User flows and GUI).
- **Setup:** Global test setup is handled in `jest.setup.ts`.

## Key Files

- `package.json`: SINGLE ROOT dependencies and scripts.
- `ARCHITECTURE.md`: The primary source of truth for architecture and implementation plans.
- `src/app/layout.tsx`: The global shell and providers.
- `src/app/page.tsx`: The main dashboard entry point (Client Component).
- `src/app/api/`: Stateless Route Handlers.
- `docker-compose.yml`: Local PostgreSQL configuration.

- `jest.config.ts`: Jest configuration.
