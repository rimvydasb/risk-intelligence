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
- **Architecture:** Next.js full-stack application with a graph-based data model (PostgreSQL + Apache AGE).

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript.
- **UI Components:** Material UI (MUI) v5 with Emotion.
- **Graph Visualization:** Cytoscape.js.
- **Testing:** Jest and React Testing Library.
- **Database (Planned):** PostgreSQL with Apache AGE extension for graph queries.
- **Search (Planned):** Typesense for fast faceted filtering.

## Building and Running

### Key Commands

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run test`: Runs the test suite using Jest.
- `npm run test:watch`: Runs tests in watch mode.
- `npm run test:coverage`: Generates test coverage reports.

## Development Conventions

### Coding Standards

- **Indentation:** Use **4 spaces** for all code files (TSX, TS, CSS, etc.).
- **Line Length:** Maximum **120 characters**.
- **Naming:** Use descriptive names for variables, functions, and classes. Avoid abbreviations.
- **Constants:** Always use `UPPER_CASE`.
- **Styling:** Prefer Material UI components and the `sx` prop or Emotion for custom styling.

### Architecture & Patterns

- **App Router:** All pages and layouts are located in `src/app`.
- **Components:** Reusable UI components are in `src/components`.
- **Graph Logic:** Visualization logic is encapsulated in `GraphView.tsx` using Cytoscape.js.
- **SAD Document:** Refer to `risk-intelligence-sad.md` for the detailed system and architecture design.

### Testing Practices

- **Unit Tests:** Located alongside components in `__tests__` directories (e.g.,
  `src/components/__tests__/GraphView.test.tsx`).
- **Setup:** Global test setup is handled in `jest.setup.ts`.
- **Mocks:** Use Jest mocks for external libraries like `cytoscape`.

## Key Files

- `package.json`: Project dependencies and scripts.
- `risk-intelligence-sad.md`: The primary source of truth for architecture and implementation plans.
- `src/app/page.tsx`: The main entry point of the application.
- `src/components/GraphView.tsx`: The core graph visualization component.
- `tsconfig.json`: TypeScript configuration.
- `eslint.config.mjs`: ESLint configuration.
- `jest.config.ts`: Jest configuration.
