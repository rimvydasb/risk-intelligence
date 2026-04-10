## Development Plan

[ARCHITECTURE.md](ARCHITECTURE.md)

### Phase 1 — Foundation & Local Sandbox

> **Goal:** Establish a functional local environment with a "seed" database.

- [x] Set up local PostgreSQL via `docker-compose.yml` (DB only).
- [x] Initialize Prisma with the core schema (Company, Contract, Person).
- [x] Implement `npm run db:setup`: Script to initialize schema and run basic health checks.
- [x] Implement `Fetcher` POC: Successfully ingest and parse the two known `viespirkiai` sample endpoints.

### Phase 2 — Data Synthesis Engine

> **Goal:** Expand the 2-node graph into a meaningful network for risk analysis.

- [x] **Build Synthesizer:** Create a Node.js utility to generate ~1,000 synthetic Companies and ~5,000 Contracts.
- [x] **Relational Logic:** Ensure synthesized data follows real-world distributions (e.g., Pareto distribution for
  contract values).
- [x] **Identity Normalization:** Implement the `Entity Resolver` logic locally to handle synthetic name variations.
- [x] **Seed Local DB:** Create a rich local dataset for testing the "360 View."

### Phase 3 — Risk Scoring & Pathfinding POC

> **Goal:** Implement the business logic (Inference Engine) on the synthesized data.

- [x] Implement the **Calculation on Write (CoW)** risk scorer locally.
- [x] Write and optimize the **Recursive CTEs** for multi-hop pathfinding.
- [x] Verify UC-1 (Cartel) and UC-2 (Shell) detection logic against synthesized anomalies.
- [x] Implement the `DisplayScore` (Logarithmic) calculation.

### Phase 4 — Biological UI & Visualization POC (The "GUI")

> **Goal:** Pivot to a Graph-First architecture and build the interactive Biological Interaction Network dashboard.

- [x] Build the Next.js App Router shell (Strictly SPA mode).
- [ ] **Refactor Front Page:** Remove the search-landing page; make the full-viewport Cytoscape canvas the primary front
  page.
- [ ] **Default Anchor implementation:** Configure the initial state to fetch and render the "geležinkeliai" Node-Link
  Diagram.
- [ ] **Top-Bar Search:** Implement a persistent global search bar overlaid at the top of the graph canvas.
- [ ] **Node Detail View:** Implement the "geležinkeliai" (and other nodes) detailed view as a slide-out sidebar
  triggered by a single click.
- [ ] **Biological Layout:** Integrate force-directed physics (`cytoscape-fcose`) to achieve the organic, cell-like
  clustering.
- [ ] **E2E/GUI Testing:** Update Cypress test suite for the Graph-First flow (Anchor -> Search -> Profile Overlay).

### Phase 5 — Cloud Transition (Deferred)

> **Goal:** Move the verified POC to production-grade infrastructure.

- [ ] Migrate local PostgreSQL schema to Supabase.
- [ ] Configure Vercel for serverless deployment of the Next.js API/Frontend.
- [ ] Port the Fetcher/Synthesizer logic into a stateful GitHub Action ETL runner.
- [ ] Implement production-grade rate limiting and monitoring.

### Phase 6 — Advanced Detection & Hardening

> **Goal:** Mature the detection algorithms and harden for real-world use.

- [ ] Verify tender participant list availability in CVP IS data (Open Question #2)
- [ ] Verify VTEK machine-readable data in `/asmuo` JSON (Open Question #3)
- [ ] Assess SABIS subcontractor data completeness (Open Question #6)
- [ ] Implement WebGL renderer fallback for graphs exceeding 1,000 nodes
- [ ] Add TED (EU) cross-border tender data for transnational bid rigging detection
- [ ] Add CPVA/esinvesticijos.lt integration for EU fund double-dipping
- [ ] Legal review: GDPR DPA notification if storing PEP natural person data (Open Question #7)
- [ ] Performance test: relationship traversals at 500k+ nodes, optimize Recursive CTEs

## 3. Open Questions and Risks

| # | Question                                                               | Risk if Unresolved                                                               | Owner                       |
|---|------------------------------------------------------------------------|----------------------------------------------------------------------------------|-----------------------------|
| 1 | Can we get bulk data export from viespirkiai.org?                      | Phase 1 seeding relies on scraping ~millions of IDs without a seed list          | Contact viespirkiai.org     |
| 2 | Are tender participant lists (co-bidders) available via API?           | UC-01 (cartel detection) is blocked without participant data                     | Verify VPT CVP IS data      |
| 3 | Is VTEK interest declaration data machine-readable in the /asmuo JSON? | UC-03 (PEP) needs structured VTEK data                                           | Test against sample JARs    |
| 4 | Does PostgreSQL handle 500k+ relationship traversals efficiently?      | May need to optimize Recursive CTEs or use caching                               | Benchmark at 100k nodes     |
| 5 | Rate limit policy of viespirkiai.org                                   | Pipeline could get blocked without a known limit                                 | Contact or empirically test |
| 6 | Subcontractor data completeness in SABIS                               | UC-04 (AML path) is only partially implementable                                 | Assess SABIS coverage       |
| 7 | GDPR DPA notification                                                  | If storing PEP natural person data, may require registering as a data controller | Legal review                |
