# Risk Intelligence System — System and Architecture Design Document

**Version:** 0.1-DRAFT  
**Date:** 2026-04-10  
**Author:** [Author]  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Data Sources and API Contract](#2-data-sources-and-api-contract)
3. [System Goals and Non-Goals](#3-system-goals-and-non-goals)
4. [Use Cases](#4-use-cases)
5. [Risk Scoring Model](#5-risk-scoring-model)
6. [Graph Data Model](#6-graph-data-model)
7. [System Architecture](#7-system-architecture)
8. [Technology Stack](#8-technology-stack)
9. [Data Ingestion Pipeline](#9-data-ingestion-pipeline)
10. [Cytoscape.js Visualization Layer](#10-cytoscapejs-visualization-layer)
11. [API Design](#11-api-design)
12. [Storage Design](#12-storage-design)
13. [Security and Legal Considerations](#13-security-and-legal-considerations)
14. [Open Questions and Risks](#14-open-questions-and-risks)

---

## 1. Executive Summary

This document describes the architecture of a **Risk Intelligence system** that ingests Lithuanian public procurement data from [viespirkiai.org](https://viespirkiai.org), models entities and relationships as a graph, assigns risk scores, and visualizes suspicious patterns using **Cytoscape.js**.

The system targets three core fraud typologies:
- **Bid rigging / cartel detection** — identifying artificial competition among suppliers
- **Shell company / money laundering detection** — identifying mismatches between contract value and company substance
- **PEP exposure / conflict of interest** — linking procurement decision-makers to winning suppliers

The primary data foundation is viespirkiai.org, which acts as an aggregator of ~15 Lithuanian government data sources under open CC BY 4.0 licenses. It exposes per-contract and per-entity JSON APIs directly usable for graph construction.

---

## 2. Data Sources and API Contract

### 2.1 viespirkiai.org API

Two core endpoints power the graph construction:

**Contract endpoint:**
```
GET https://viespirkiai.org/sutartis/{CONTRACT_ID}.json
```

Key fields observed in production:
```json
{
  "sutartiesUnikalusID": "2007700250",
  "perkanciosiosOrganizacijosKodas": "188704927",
  "tiekejoKodas": "803",
  "tiekejasPatikslinimas": "MGGP Aero Sp. z o.o.",
  "tiekejasSalis": "Lenkija",
  "verte": 32670,
  "tipas": "MVP",
  "sudarymoData": "2025-06-19",
  "galiojimoData": "2026-12-31",
  "bvpzKodas": "79400000-8",
  "papildomiTiekejai": [],
  "sabisSutartys": [...],
  "cvpisPirkimas": {...},
  "dokumentai": [...]
}
```

**Legal entity (company) endpoint:**
```
GET https://viespirkiai.org/asmuo/{JAR_CODE}.json
```

Key fields observed in production:
```json
{
  "jar": {
    "jarKodas": 110053842,
    "pavadinimas": "AB Lietuvos geležinkeliai",
    "registravimoData": "1991-12-24",
    "statusasNuo": "2021-12-16"
  },
  "sodra": {
    "draustieji": 122,
    "vidutinisAtlyginimas": 5023.51,
    "imokuSuma": 141131.28,
    "duomenys": [...]
  }
}
```

Full entity profiles also include: VMI tax data, Registrų centras shareholders, LITEKO court records, VTEK interest declarations, Regitra vehicle ownership, Darbo inspekcija violations.

### 2.2 Upstream Government Sources

| Source | Data Provided | Risk Relevance |
|---|---|---|
| VPT / CVP IS (old + new) | Procurement tender records | Tender history, winner patterns |
| VPT / Sutarčių duomenys | Contract amounts, types | Shell co detection |
| VPT / Neskelbiamos derybos | Non-advertised negotiations | High corruption signal |
| VPT / Nepatikimi tiekėjai | Blacklisted suppliers | Direct risk indicator |
| Registrų centras / JADIS | Shareholders, UBO, capital | AML beneficial owner chains |
| Atvira SODRA | Employees, avg salary, contributions | Substance vs revenue check |
| VMI | Tax paid | Revenue vs tax mismatch |
| VTEK / Privačių interesų registras | Officials' interest declarations | PEP conflict of interest |
| LITEKO | Court rulings, bankruptcies | Legal exposure history |
| CPVA / esinvesticijos.lt | EU fund projects | Double-dipping, EU fraud |
| TED (EU) | Cross-border tenders | Transnational bid rigging |
| DOMREG (KTU) | Domain owners | Linked digital assets |
| Konkurencijos taryba / KOTIS | State aid | Subsidized entity gaming |

### 2.3 Data Access Notes

- All data is publicly available; viespirkiai.org operates under CC BY 4.0.
- No authentication required for the JSON API.
- Data exports are available on request (contact form on the site).
- An **MCP (Model Context Protocol)** endpoint is exposed — relevant if AI-assisted reasoning is integrated later.
- Rate limiting behavior is unknown; assume polite crawling (1–2 req/sec) until confirmed.
- Data disclaimer: viespirkiai.org explicitly states data may be outdated or incorrect. All risk scores must treat it as probabilistic, not authoritative.

---

## 3. System Goals and Non-Goals

### Goals
- Ingest public procurement and entity data into a graph database.
- Compute risk scores per entity and per relationship.
- Detect and surface suspicious structural patterns (clusters, rotational wins, shell nodes, PEP paths).
- Visualize the graph interactively via Cytoscape.js with filtering by risk threshold.
- Provide an API for programmatic access to risk scores and graph data.

### Non-Goals
- This is **not a legal determination system**. It produces risk signals, not verdicts.
- It does **not process non-public data** (no court access, no SODRA raw data — only what viespirkiai.org already exposes).
- It does **not perform real-time streaming** ingestion in v1. Batch ingestion is sufficient.
- It does **not replace** AML compliance systems like those built on FICO Blaze Advisor — it is a **risk signal feeder**, not a decisioning engine.

---

## 4. Use Cases

### UC-01: Bid Rigging / Cartel Detection

**Trigger:** Analyst investigates a tender category or a contracting authority.

**Detection logic:**
- Find all tenders where ≥3 of the same companies appear as participants.
- Identify rotational win patterns: companies A, B, C bid together repeatedly; each wins roughly 1/N of tenders.
- Identify spoiler bids: losing companies consistently submit bids 20–40% above the winner — suggesting they are providing cover quotes.

**Graph shape in Cytoscape.js:**
- Nodes: Companies (sized by total contract value won)
- Edges: Co-participation in the same tender (weighted by frequency)
- Layout: CoSE or force-directed — dense clusters of co-participants become visually obvious.
- Highlight: Edges where both nodes won alternately (rotational signal).

**Risk score contribution:** +60 per detected cluster member, +40 if win rotation is confirmed.

**Data needed:** CVP IS tender participants list (currently partially exposed via viespirkiai.org procurement data).

**Limitation:** Requires historical depth (≥3 years) to rule out coincidence. Tender participant lists are not always complete in the current API — may require direct VPT data export.

---

### UC-02: Shell Company / Fronting Detection

**Trigger:** Contract value is disproportionate to company substance.

**Detection logic:**
- Compare contract `verte` (value) with SODRA `draustieji` (insured employees) and `imokuSuma` (monthly social contributions).
- Flag: `contract_value > 500,000 EUR` AND `employees < 5`.
- Flag: Company registration date within 6 months before contract signing date.
- Flag: Company has no prior contract history but wins a large direct negotiation (`tipas = "MVP"` or neskelbiamos derybos).

**Graph shape in Cytoscape.js:**
- Nodes: Company (color = risk level; size = contract value)
- Node label shows: employees, registration age, win method
- Edge to: Contracting authority, shareholders, linked entities via JADIS

**Risk score contribution:**
- `employees < 2`: +50
- `company age < 6 months at contract date`: +80
- `non-advertised negotiation`: +80
- `blacklisted supplier`: +100

**Data available:** All required fields are present in the current `/asmuo/{JAR}.json` endpoint (SODRA section + JAR registration date + VPT contract type).

---

### UC-03: PEP / Conflict of Interest Detection

**Trigger:** A public official or procurement committee member has a financial relationship with a winning supplier.

**Detection logic:**
- Load VTEK interest declarations for officials linked to a contracting authority.
- Traverse declared interests: Official → Spouse → Relatives → Companies → Shareholders.
- If a company at any hop depth ≤ 3 has an active contract with the official's institution → conflict signal.

**Graph shape in Cytoscape.js:**
- Start node: Public official (Person type)
- Expand: interest declaration links (VTEK data)
- Target: Contract nodes awarded by the official's institution
- Highlight: Shortest path between official and supplier

**Risk score contribution:**
- Direct ownership of winning company: +100
- Spouse-owned company wins: +90
- Relative (1st degree) ownership: +70
- Common director/shareholder of winning company: +60

**Limitation:** VTEK declarations are self-reported and may be incomplete. System flags missing declarations as a risk signal itself.

---

### UC-04: Subcontractor Money Laundering Path

**Trigger:** A prime contractor wins a large contract, then transfers most of the value to subcontractors.

**Detection logic:**
- If subcontractor data is available via SABIS (`sabisSutartys` field in contract JSON): map the money flow graph.
- Flag: Prime contractor receives X EUR; subcontractor receives > 80% of X within 30 days.
- Flag: Subcontractor shareholders overlap with prime contractor shareholders (circular ownership).

**Graph shape in Cytoscape.js:**
- Directed graph: money flow as directed edges with amount labels
- Color gradient: amount density (red = high value flow)
- Identify cycles: if money flows back to a node connected to the original contractor

**Risk score contribution:**
- >80% value passed to single subcontractor: +70
- Circular shareholder structure: +90
- Subcontractor on blacklist: +100

**Data limitation:** Subcontractor relationships are only partially available via SABIS data in viespirkiai.org. This use case may require direct CVP IS integration or manual enrichment.

---

### UC-05: EU Fund Double-Dipping Detection

**Trigger:** A company receives both a public procurement contract and EU fund project support for the same activity.

**Detection logic:**
- Cross-reference `cpvaProjektuSutartys` field in contract JSON with CPVA project data.
- Flag: Same company, same CPV code, overlapping date ranges, both funded.
- Flag: Company appears in both national VPT contracts and TED (EU-level) contracts simultaneously for the same deliverable.

**Risk score contribution:**
- Duplicate-funded activity detected: +80

---

## 5. Risk Scoring Model

### 5.1 Design Philosophy

Scores are **additive and weighted**, not a binary pass/fail. Each node (Company, Person, Contract) carries a cumulative `riskScore`. Edges carry their own `edgeRiskScore`. The system surfaces nodes and subgraphs above a configurable threshold.

Scores are **probabilistic signals**, not determinations. The display layer must communicate this clearly.

### 5.2 Node Risk Score Components

**Company node:**

| Signal | Score | Data Source |
|---|---|---|
| Blacklisted supplier (VPT) | +100 | viespirkiai.org blacklist |
| Employees < 2 | +50 | SODRA via /asmuo |
| Company age < 6 months at contract | +80 | JADIS registravimoData |
| Non-advertised negotiation win | +80 | VPT neskelbiamos |
| No tax payments (VMI = 0) | +60 | VMI via /asmuo |
| Court bankruptcy proceedings | +70 | LITEKO via /asmuo |
| Shareholder is also a shareholder of competitor | +50 | JADIS cross-reference |
| Foreign registration + LT contract | +20 | tiekejasSalis field |
| Missing VTEK declaration (for officials) | +40 | VTEK cross-reference |

**Person node (PEP):**

| Signal | Score |
|---|---|
| Official directly owns winning company | +100 |
| Spouse owns winning company | +90 |
| 1st degree relative owns winning company | +70 |
| Sits on board of winning company | +80 |

### 5.3 Edge Risk Score Components

| Signal | Score |
|---|---|
| Rotational win with co-bidder (confirmed) | +60 |
| Subcontractor receives >80% of prime value | +70 |
| Shareholder link between co-bidders | +50 |
| Contract awarded without advertisement | +80 |

### 5.4 Composite Score

```
entityRiskScore = sum(all applicable node signals)
edgeRiskScore   = sum(all applicable edge signals)
graphPathScore  = sum(edgeRiskScores along path) / path_length
```

Threshold recommendations (configurable):
- `>= 100`: Display in Cytoscape with yellow highlight
- `>= 150`: Orange highlight, alert generated
- `>= 200`: Red highlight, high-priority alert

---

## 6. Graph Data Model

### 6.1 Node Types

```
Node: Company
  - jarKodas: string (primary key)
  - pavadinimas: string
  - registravimoData: date
  - statusasNuo: date
  - employees: int          (SODRA draustieji)
  - avgSalary: decimal      (SODRA vidutinisAtlyginimas)
  - monthlyContributions: decimal
  - riskScore: int
  - flags: string[]

Node: Person
  - id: string
  - name: string
  - role: enum [OFFICIAL, SHAREHOLDER, DIRECTOR, UBO]
  - institutionCode: string
  - riskScore: int

Node: Contract
  - contractId: string      (sutartiesUnikalusID)
  - value: decimal          (verte)
  - signedDate: date
  - type: string            (tipas: MVP | etc.)
  - cpvCode: string
  - procurementId: string
  - riskScore: int

Node: Institution
  - jarKodas: string
  - pavadinimas: string
  - type: enum [MINISTRY, MUNICIPALITY, SOE, AGENCY]

Node: Tender
  - pirkimoNumeris: string
  - type: string
  - advertised: boolean
  - participantCount: int
```

### 6.2 Edge Types

```
Edge: AWARDED_TO          (Institution → Company, via Contract)
Edge: PARTICIPATED_IN     (Company → Tender)
Edge: WON                 (Company → Tender)
Edge: SHAREHOLDER_OF      (Person → Company, weight = share %)
Edge: DIRECTOR_OF         (Person → Company)
Edge: DECLARED_INTEREST   (Person → Company, via VTEK)
Edge: SUBCONTRACTED_TO    (Company → Company, value = amount)
Edge: CO_BIDDER           (Company → Company, tender = reference, weight = frequency)
Edge: EMPLOYED_AT         (Person → Institution)
```

---

## 7. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│              React + Cytoscape.js (Browser SPA)                      │
│   [Graph View] [Risk Filter] [Entity Detail] [Alert Dashboard]       │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ REST / GraphQL
┌───────────────────────────▼──────────────────────────────────────────┐
│                         API LAYER                                     │
│              Spring Boot (Java 21)                                    │
│   /api/graph/{entityId}   /api/risk/{entityId}   /api/alerts         │
└──────────┬────────────────┬─────────────────────────────────────────-┘
           │                │
┌──────────▼───────┐  ┌─────▼──────────────────────────────────────────┐
│  Risk Scoring    │  │  Graph Query Engine                             │
│  Engine          │  │  (Neo4j Cypher or PostgreSQL + AGE extension)   │
│  (Java service)  │  │                                                  │
└──────────┬───────┘  └─────┬────────────────────────────────────────--┘
           │                │
┌──────────▼────────────────▼──────────────────────────────────────────┐
│                        DATA LAYER                                     │
│  PostgreSQL (relational + AGE graph extension)                        │
│  or Neo4j Community Edition                                           │
│  [companies] [contracts] [persons] [edges] [risk_scores] [alerts]    │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                      INGESTION PIPELINE                               │
│                  Node.js + Bull queue (or Python)                     │
│   [viespirkiai.org scraper] → [enricher] → [graph builder]           │
│   [risk scorer] → [alert generator]                                   │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                             │
│  viespirkiai.org/sutartis/{id}.json                                  │
│  viespirkiai.org/asmuo/{jar}.json                                    │
│  (future: direct VPT, VTEK, LITEKO APIs)                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Your existing stack |
| Graph visualization | Cytoscape.js | Specified requirement; handles 10k+ nodes |
| UI components | TailwindCSS + shadcn/ui | Rapid iteration |
| Backend API | Spring Boot (Java 21) | Your primary backend expertise |
| Graph storage | PostgreSQL + Apache AGE | Avoids introducing Neo4j; AGE adds Cypher on top of PG |
| Relational storage | PostgreSQL | Shared instance with AGE |
| Search | Typesense | Same as viespirkiai.org itself; fast faceted filtering |
| Ingestion | Node.js (matches VP stack) or Python | Lightweight scraper/transformer |
| Queue | Bull (Redis-backed) or plain cron | Rate-limited ingestion scheduling |
| Containerization | Docker Compose | Local + prod parity |
| Hosting | Any Ubuntu VPS (same as VP: Ubuntu 24.04 LTS) | Operational simplicity |

**Graph DB decision note:** PostgreSQL + Apache AGE is a pragmatic choice — you avoid running two separate databases and AGE gives you Cypher query syntax. The trade-off is that AGE is less mature than Neo4j for complex traversals. If query complexity grows (e.g., multi-hop path finding across 500k nodes), migrating to Neo4j Community is a valid escalation path.

---

## 9. Data Ingestion Pipeline

### 9.1 Phase 1 — Seed (one-time)

1. Request bulk data export from viespirkiai.org (contact form) — they offer data exports.
2. Load all contracts and entities into PostgreSQL.
3. Run initial risk scoring pass.
4. Build graph edges from contract-entity-person relationships.

### 9.2 Phase 2 — Incremental Sync

```
Schedule: nightly (02:00 EET)

For each new contract ID in VPT feed:
  1. GET /sutartis/{id}.json
  2. Extract: buyer JAR, supplier JAR, contract type, value, date
  3. For each JAR:
       GET /asmuo/{jar}.json → upsert Company node with SODRA/VMI data
  4. Create/update edges (AWARDED_TO, PARTICIPATED_IN)
  5. Recompute risk scores for affected nodes
  6. If riskScore delta > threshold → generate alert
```

### 9.3 Rate Limiting Strategy

- 1 request/second to viespirkiai.org (conservative; adjust after testing).
- Exponential backoff on 429/503.
- Cache entity profiles for 7 days (they change infrequently).
- Cache contract records indefinitely (immutable once signed).

### 9.4 Data Quality Handling

- `tiekejoKodas: "803"` maps to a foreign company placeholder — resolve via `tiekejasPatikslinimas` name field.
- Missing SODRA data means the company has no Lithuanian employees — **treat as elevated risk signal**, not missing data.
- `faktineIvykdimoData: null` means contract not yet completed — flag as open/active.

---

## 10. Cytoscape.js Visualization Layer

### 10.1 Layouts

| Use Case | Recommended Layout | Reason |
|---|---|---|
| Cartel cluster detection | CoSE-Bilkent | Reveals tight clusters naturally |
| PEP path traversal | Breadth-First from Person node | Shows hop distance to winning company |
| Subcontractor money flow | Dagre (DAG layout) | Directed flow is readable top-down |
| General overview | Concentric (by risk score) | Highest risk at center |

### 10.2 Visual Encoding

```
Node size        → total contract value (log scale)
Node color       → risk score: green (<100) / yellow (100-149) / orange (150-199) / red (≥200)
Node shape       → type: ellipse=Company, rectangle=Institution, diamond=Person, triangle=Contract
Edge width       → co-bid frequency or subcontract value
Edge color       → edge risk score gradient
Edge style       → dashed = inferred/indirect relationship; solid = direct/documented
```

### 10.3 Interaction Design

- **Click node** → side panel shows entity detail, risk score breakdown, source links.
- **Double-click** → expand node (load and render 1-hop neighbors from API).
- **Risk threshold slider** → hide nodes below threshold (server-side filter or client-side `cy.filter()`).
- **Path finder** → "Find path between A and B" using Cytoscape's built-in BFS or Dijkstra.
- **Alert overlay** → pulsing animation on nodes that triggered alerts in the last 24h.

### 10.4 Performance Considerations

- Render max 2,000 nodes at once in Cytoscape (browser memory limit for interactive graph).
- For larger traversals, use server-side subgraph extraction and return only the relevant neighbourhood.
- Use WebGL renderer (`cytoscape-three.js` or `cytoscape-canvas`) if node count regularly exceeds 1,000.
- Virtualize the node list in the side panel — don't render 50,000 rows in the DOM.

---

## 11. API Design

### Core endpoints

```
GET  /api/entities/{jarKodas}
     → Entity profile + risk score breakdown

GET  /api/entities/{jarKodas}/graph?depth=2&minRisk=100
     → Subgraph (nodes + edges) up to depth hops, filtered by risk threshold
     → Returns Cytoscape.js-compatible JSON (elements: {nodes, edges})

GET  /api/contracts/{contractId}
     → Contract detail + linked entities

GET  /api/search?q={term}&type={company|person|contract}
     → Typesense-backed full-text search

GET  /api/alerts?since={iso_date}&minRisk=150
     → Alerts generated since date, sorted by risk score desc

GET  /api/risk/explain/{jarKodas}
     → Human-readable breakdown of score components for an entity

POST /api/graph/path
     body: { from: jarKodas, to: jarKodas, maxDepth: 5 }
     → Shortest risk path between two entities
```

### Graph response format (Cytoscape.js-compatible)

```json
{
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "110053842",
          "label": "AB Lietuvos geležinkeliai",
          "type": "Company",
          "riskScore": 45,
          "employees": 122,
          "totalContractValue": 5200000
        }
      }
    ],
    "edges": [
      {
        "data": {
          "id": "e1",
          "source": "188704927",
          "target": "110053842",
          "type": "AWARDED_TO",
          "contractId": "2007700250",
          "value": 32670,
          "edgeRiskScore": 0
        }
      }
    ]
  },
  "meta": {
    "totalNodes": 1,
    "totalEdges": 1,
    "queryDepth": 1,
    "generatedAt": "2026-04-10T12:00:00Z"
  }
}
```

---

## 12. Storage Design

### 12.1 Key Tables (PostgreSQL relational)

```sql
-- Core entity store
companies (jar_kodas PK, name, registered_date, status, employees, avg_salary,
           monthly_contributions, risk_score, flags jsonb, raw_data jsonb, updated_at)

persons   (id PK, name, role, institution_jar, risk_score, flags jsonb, updated_at)

contracts (contract_id PK, buyer_jar, supplier_jar, value, signed_date, type,
           cpv_code, procurement_id, risk_score, raw_data jsonb, updated_at)

-- Risk scoring
risk_signals (id, entity_id, entity_type, signal_type, score, detail, detected_at)

alerts       (id, entity_id, entity_type, risk_score, triggered_by jsonb, resolved, created_at)

-- Ingestion tracking
ingestion_log (id, entity_type, entity_id, status, attempted_at, error_detail)
```

### 12.2 Graph Layer (Apache AGE on same PostgreSQL)

```cypher
-- Create graph
SELECT create_graph('risk_graph');

-- Create edges
SELECT * FROM cypher('risk_graph', $$
  MATCH (c:Company {jarKodas: '188704927'}), (s:Company {jarKodas: '110053842'})
  CREATE (c)-[:AWARDED_TO {contractId: '2007700250', value: 32670}]->(s)
$$) AS (result agtype);

-- Query: find all companies with risk > 150 within 2 hops
SELECT * FROM cypher('risk_graph', $$
  MATCH path = (a:Company {jarKodas: $startId})-[*1..2]-(b:Company)
  WHERE b.riskScore > 150
  RETURN path
$$, $params) AS (path agtype);
```

---

## 13. Security and Legal Considerations

### Legal
- All data originates from public Lithuanian government registries under CC BY 4.0. Use is permitted.
- viespirkiai.org explicitly disclaims accuracy — **never present scores as legal findings**.
- GDPR applies to Person nodes containing natural person data. If the system stores VTEK declarations or shareholder data that identifies individuals:
  - Store only data already publicly disclosed by VTEK/JADIS (no new collection).
  - Provide a data correction/removal contact mechanism (same obligation as viespirkiai.org).
  - Do not expose Person node full names via public unauthenticated API endpoints.

### Security
- The backend API should require authentication (JWT) before serving graph data.
- No raw government data should be re-exposed without transformation (no API that just proxies viespirkiai.org).
- Risk score explanations containing personal data (PEP paths) must be access-controlled.
- Implement query depth limits (max depth=4) to prevent traversal-based DoS on the graph engine.

---

## 14. Open Questions and Risks

| # | Question | Risk if Unresolved | Owner |
|---|---|---|---|
| 1 | Can we get bulk data export from viespirkiai.org? | Phase 1 seeding relies on scraping ~millions of IDs without a seed list | Contact viespirkiai.org |
| 2 | Are tender participant lists (co-bidders) available via API? | UC-01 (cartel detection) is blocked without participant data | Verify VPT CVP IS data |
| 3 | Is VTEK interest declaration data machine-readable in the /asmuo JSON? | UC-03 (PEP) needs structured VTEK data | Test against sample JARs |
| 4 | Does Apache AGE handle 500k+ node graphs without degradation? | May need to migrate to Neo4j if graph grows large | Benchmark at 100k nodes |
| 5 | Rate limit policy of viespirkiai.org | Pipeline could get blocked without a known limit | Contact or empirically test |
| 6 | Subcontractor data completeness in SABIS | UC-04 (AML path) is only partially implementable | Assess SABIS coverage |
| 7 | GDPR DPA notification | If storing PEP natural person data, may require registering as a data controller | Legal review |

---

## Appendix A: Risk Score Reference Card

| Score Range | Interpretation | Display |
|---|---|---|
| 0–49 | No significant signals | Grey node |
| 50–99 | Minor anomalies | Green node |
| 100–149 | Moderate risk — warrants manual review | Yellow node |
| 150–199 | High risk — alert generated | Orange node |
| 200+ | Critical — escalate | Red pulsing node |

---

## Appendix B: Data Field Mapping

| viespirkiai.org Field | Internal Field | Used In |
|---|---|---|
| `sutartiesUnikalusID` | `contract_id` | Contract node PK |
| `perkanciosiosOrganizacijosKodas` | `buyer_jar` | Institution node |
| `tiekejoKodas` | `supplier_jar` | Company node (caution: "803" = foreign) |
| `tiekejasPatikslinimas` | `supplier_name_raw` | Foreign company name |
| `tiekejasSalis` | `supplier_country` | Risk signal if non-LT |
| `verte` | `contract_value` | Shell detection |
| `tipas` | `contract_type` | MVP = non-advertised signal |
| `sudarymoData` | `signed_date` | Company age check |
| `sodra.draustieji` | `employees` | Shell detection |
| `sodra.imokuSuma` | `monthly_contributions` | Substance check |
| `jar.registravimoData` | `company_registered` | Age at contract date |
| `jar.statusasNuo` | `status_change_date` | Dormancy detection |
| `papildomiTiekejai` | `co_suppliers` | AML subcontract path |
| `sabisSutartys` | `sabis_contracts` | SABIS money flow |
| `cpvaProjektuSutartys` | `eu_projects` | Double-dipping check |
