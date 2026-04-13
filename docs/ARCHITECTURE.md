# Risk Intelligence System — System and Architecture Design Document

## Table of Contents

## Executive Summary

This document describes the architecture of a **Risk Intelligence system** (RIS) that provides relationship diagrams
between public companies, public company employees including their family members and public procurement contracts in
Lithuania.

As the main source of data, RIS will use [viespirkiai.org](https://viespirkiai.org).

**Graph-First UX Paradigm:** The system features a graph-first user experience, employing Node-Link Diagrams to
visualize a "Biological Interaction Network." This approach treats the procurement ecosystem as an organic entity,
allowing investigators to intuitively spot structural anomalies (dense "inflamed" clusters). The front page immediately
immerses the user in the graph canvas, beginning with the critical anchor node "
geležinkeliai" (https://viespirkiai.org/asmuo/110053842.json) and its relationships, inviting exploration.

**360 Degree Entity View:** Clicking on any node (company, person, contract) opens a comprehensive profile view.
This includes all relevant metadata, risk scores (in the future), and a mini graph of immediate relationships.
In the database data is stored in two tables: `entities` (companies, people) and `relationships` (contracts, ownership
links, other link types). The graph visualization is a dynamic projection of this underlying relational data.

## Main Use Cases

- Graph browser using **Cytoscape.js** to visualize relationships between companies, individuals as nodes and contracts
  as edges. Interactive filtering by contract timeframe and value.

- Nepotism detection — graph browser that helps visually identify if a company has a relationship with an employee
  family members of the contracting authority.

## Main Functionality

- **viespirkiai data** - Data scraping from viespirkiai.org (and other public sources in the future) for graph
  construction.

- Graph visualization using **Cytoscape.js** with interactive filters (year, contract value) and node/edge details on
  click.

The system targets three core fraud typologies:

## Future Use Cases (Beyond v1)

- **Bid rigging / cartel detection** — identifying artificial competition among suppliers
- **Shell company / money laundering detection** — identifying mismatches between contract value and company substance
- **PEP exposure / conflict of interest** — linking procurement decision-makers to winning suppliers
- **Subcontractor laundering paths** — tracing money flows from prime contractors to subcontractors
- **EU fund double-dipping** — cross-referencing procurement contracts with EU fund projects for the same activity

---

## Technology Stack

1. **Frontend:** Next.js 16 (Hash Based Routing) + React 19, with Cytoscape.js for graph visualization.
2. **Design System:** Material UI for consistent styling and responsive design.
3. **Midlayer:** TanStack React Query for data fetching and caching, ensuring efficient API interactions. React
   useContext for global state management.
4. **Database:** PostgreSQL within Docker for development; Supabase Postgres in production for managed hosting.
5. **ORM:** Prisma for type-safe database access and migrations.
6. **Testing:** Jest for unit tests; Cypress for end-to-end testing of the UI and integration points.
7. **Hosting:** Vercel for production deployment of the Next.js application; GitHub Actions for CI/CD pipelines.
8. **Data Ingestion:** Node.js scripts executed via GitHub Actions for scheduled ETL processes to populate the database.

### Constraints

1. Vercel deployment must be supported
2. No Server Side Rendering (SSR) for UI components
3. Single-page application with hash-based routing

---

## Basic Data Structures

```typescript

interface TemporalEntity {
    uuid: string;
    name: string;
    fromDate: Date;
    tillDate: Date | null; // null means "present"
}

/**
 * CompanyEntity represents a legal entity (company) in the graph.
 * uuid - jarKodas
 * name - pavadinimas
 * fromDate - registravimoData
 *
 * @example https://viespirkiai.org/asmuo/307562016.json
 */
interface OrganizationEntity extends TemporalEntity {
    type: 'PrivateCompany' | 'PublicCompany' | 'Institution';
    dataReference: string; // jarKodas to STAGING_ASMUO
}

/**
 * PersonEntity represents an individual (natural person) in the graph.
 * uuid - pinreg.darbovietes[].deklaracija (declaration UUID, unique per person)
 * name - pinreg.darbovietes[].vardas + " " + pavarde
 * fromDate - pinreg.darbovietes[].rysioPradzia (start of relationship with organization)
 *
 * Note: Same person across multiple orgs will have different deklaracija UUIDs.
 * Same person at same org may appear multiple times (different roles) with same deklaracija.
 *
 * @example: https://viespirkiai.org/asmuo/110053842.json
 * @example: [110053842.json](examples/asmuo/110053842.json)
 */
interface PersonEntity extends TemporalEntity {
    data: Record<string, any> // pinreg.darbovietes[].*
}

/**
 * TenderEntity represents a procurement tender or competition.
 * uuid - pirkimoNumeris
 * name - pavadinimas
 *
 * @example https://viespirkiai.org/viesiejiPirkimai/7346201.json
 * @example [7346201.json](examples/viesiejiPirkimai/7346201.json)
 */
interface TenderEntity extends TemporalEntity {
    dataReference: string; // pirkimoNumeris to STAGING_PIRKIMAS
}

/**
 * @example:
 *  fromDate - paskelbimoData (if Contract)
 *  tillDate - galiojimoData (if Contract)
 *  name - label (CEO, 300 EUR, etc.)
 */
interface Relationship extends TemporalEntity {
    type: 'Contract' | 'Ownership' | 'Employment' | 'Spouse' | 'Relative' | 'Official' | 'Shareholder' | 'Director' | 'DeclaredInterest' | 'Subcontract' | 'CoBidder';
    source: string; // uuid
    target: string; // uuid
    data: Record<string, any>
}

interface ContractRelationship extends Relationship {
    type: 'Contract';
    dataReference: string; // sutartiesUnikalusID to STAGING_SUTARTIS
}

```

## Data Sources and API Contract

**Sutartys (Contracts)**

- https://viespirkiai.org/sutartis/{sutartiesUnikalusID}.json
- for scraping GUI: https://viespirkiai.org/?search=paslaugos (for example "paslaugos" is a keyword)

**Asmuo (Company)**

- https://viespirkiai.org/asmuo/{jarKodas}.json
- for scraping GUI: https://viespirkiai.org/juridiniai?search=paslaugos (for example "paslaugos" is a keyword)

**Pirkimas, konkursas (Tender)**

- https://viespirkiai.org/viesiejiPirkimai/{pirkimoId}.json
- for scraping GUI: https://viespirkiai.org/viesiejiPirkimai?search=paslaugos&sort=paskelbimoData (for example "
  paslaugos" is a keyword)

## Data-to-Entity Mapping

This section documents how graph entities and relationships are derived from viespirkiai.org API responses.

### Mapping Overview

```mermaid
flowchart LR
    subgraph asmuo["📄 asmuo / jarKodas .json"]
        jar["jar.*"]
        sodra["sodra.*"]
        pinD["pinreg.darbovietes[]"]
        pinS["pinreg.sutuoktinio-\nDarbovietes[]"]
        pinR["pinreg.rysiaiSuJa[]"]
        topP["sutartys.topPirkejai[]"]
        topT["sutartys.topTiekejai[]"]
    end

    subgraph sutartis["📄 sutartis / sutartiesUnikalusID .json"]
        sRoot["root fields"]
    end

    subgraph pirkimas["📄 viesiejiPirkimai / pirkimoId .json"]
        pRoot["root fields"]
    end

    subgraph nodes["Nodes"]
        Org["OrganizationEntity"]
        Per["PersonEntity"]
        Ten["TenderEntity"]
    end

    subgraph edges["Edges"]
        Employment
        Director
        Official
        Spouse
        Shareholder
        Contract
    end

    jar -->|" jarKodas, pavadinimas "| Org
    sodra -.->|" enriches: employees count "| Org
    pinD -->|" vardas, pavarde "| Per
    pinD -->|" pareiguTipas = Darbuotojas "| Employment
    pinD -->|" pareiguTipas = Vadovas "| Director
    pinD -->|" pareiguTipas = Pirkimo iniciatorius "| Official
    pinS -->|" sutuoktinioVardas/Pavarde "| Per
    pinS -->|" declarant ↔ spouse "| Spouse
    pinS -->|" spouse works at org "| Employment
    pinR -->|" vardas, pavarde "| Per
    pinR -->|" rysys = Valdybos narys "| Director
    pinR -->|" rysys = Akcininkas "| Shareholder
    topP -->|" jarKodas → discover orgs "| Org
    topT -->|" jarKodas → discover orgs "| Org
    sRoot -->|" perkOrg + tiekejas codes "| Org
    sRoot -->|" buyer → supplier "| Contract
    sRoot -->|" pirkimoNumeris "| Ten
    pRoot -->|" pirkimoId, pavadinimas "| Ten
    pRoot -->|" jarKodas vykdytojas "| Org
```

### asmuo/{jarKodas}.json → Entities

The `asmuo` endpoint is the **richest source** for graph construction. A single fetch yields the organization itself,
all declared employees, their spouses, board members, and summary of contract partners.

**@example:** [110053842.json](examples/asmuo/110053842.json) (AB "Lietuvos geležinkeliai" — trimmed)

| API Section                       | Produces                        | Entity/Edge Type                             | Key Fields                                                                                                  |
|-----------------------------------|---------------------------------|----------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `jar`                             | **OrganizationEntity**          | PrivateCompany / PublicCompany / Institution | `jarKodas` → uuid, `pavadinimas` → name, `registravimoData` → fromDate, `formosKodas` → type classification |
| `sodra`                           | enriches **OrganizationEntity** | —                                            | `bendrasDraustujuSkaicius` → employee count, `bendrasVidutinisAtlyginimas` → avg salary                     |
| `pinreg.darbovietes[]`            | **PersonEntity**                | Person                                       | `deklaracija` → uuid, `vardas + pavarde` → name, `rysioPradzia` → fromDate                                  |
| `pinreg.darbovietes[]`            | **Relationship**                | Employment / Director / Official             | `pareiguTipasPavadinimas` determines type (see mapping below), source=Person, target=Organization           |
| `pinreg.sutuoktinioDarbovietes[]` | **PersonEntity** × 2            | Person (declarant + spouse)                  | Declarant: `deklaruojancioVardas/Pavarde`, Spouse: `sutuoktinioVardas/Pavarde`                              |
| `pinreg.sutuoktinioDarbovietes[]` | **Relationship**                | Spouse                                       | source=declarant Person, target=spouse Person                                                               |
| `pinreg.sutuoktinioDarbovietes[]` | **Relationship**                | Employment                                   | source=spouse Person, target=Organization                                                                   |
| `pinreg.rysiaiSuJa[]`             | **PersonEntity**                | Person                                       | `deklaracija` → uuid, `vardas + pavarde` → name, `rysioPradzia` → fromDate                                  |
| `pinreg.rysiaiSuJa[]`             | **Relationship**                | Director / Shareholder / Official            | `rysioPobudzioPavadinimas` determines type (see mapping below), source=Person, target=Organization          |
| `sutartys.topPirkejai[]`          | **OrganizationEntity** (ref)    | discovered via jarKodas                      | `jarKodas`, `pavadinimas` — organizations that buy from this one                                            |
| `sutartys.topTiekejai[]`          | **OrganizationEntity** (ref)    | discovered via jarKodas                      | `jarKodas`, `pavadinimas` — organizations that supply to this one                                           |

#### pareiguTipasPavadinimas → Relationship Type

| pareiguTipasPavadinimas      | → Relationship Type | Notes                                                |
|------------------------------|---------------------|------------------------------------------------------|
| `Vadovas ar jo pavaduotojas` | **Director**        | CEO / Deputy — high risk for nepotism                |
| `Darbuotojas`                | **Employment**      | Regular employee                                     |
| `Pirkimo iniciatorius`       | **Official**        | Procurement initiator — key for conflict of interest |
| `Ekspertas`                  | **Official**        | Expert role in procurement                           |
| _other_                      | **Official**        | Default for unrecognized role types                  |

#### rysioPobudzioPavadinimas → Relationship Type

| rysioPobudzioPavadinimas  | → Relationship Type | Notes                                     |
|---------------------------|---------------------|-------------------------------------------|
| `Valdybos narys`          | **Director**        | Board member                              |
| `Akcininkas`              | **Shareholder**     | Shareholder                               |
| `Stebėtojų tarybos narys` | **Director**        | Supervisory board member                  |
| _other_                   | **Official**        | Default for unrecognized governance roles |

### sutartis/{sutartiesUnikalusID}.json → Entities

The `sutartis` endpoint provides individual contract details — the primary source for **ContractRelationship** edges.

**@example:** [2008059225.json](examples/sutartis/2008059225.json)

| API Field                                                     | Produces                                         | Entity/Edge Type             | Mapping                                                                                                                           |
|---------------------------------------------------------------|--------------------------------------------------|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `perkanciosiosOrganizacijosKodas` + `perkanciojiOrganizacija` | **OrganizationEntity** (buyer)                   | Institution or PublicCompany | `kodas` → uuid, `pavadinimas` → name                                                                                              |
| `tiekejoKodas` + `tiekejas`                                   | **OrganizationEntity** (supplier)                | PrivateCompany               | `kodas` → uuid, `pavadinimas` → name                                                                                              |
| root                                                          | **ContractRelationship**                         | Contract                     | `sutartiesUnikalusID` → uuid, `pavadinimas` → name, `paskelbimoData` → fromDate, `galiojimoData` → tillDate, `verte` → data.verte |
| `pirkimoNumeris`                                              | **TenderEntity** (ref)                           | links Contract → Tender      | may be `null` for MVP contracts                                                                                                   |
| `papildomiTiekejai[]` / `papildomiTiekejaiKodai[]`            | additional **OrganizationEntity** + **Contract** | CoBidder                     | joint bids (v2)                                                                                                                   |

**Contract edge direction:** source = buyer (perkančioji organizacija), target = supplier (tiekėjas).

### viesiejiPirkimai/{pirkimoId}.json → Entities

The `viesiejiPirkimai` endpoint provides tender/competition details. Tenders group related contracts.

**@example:** [7346201.json](examples/viesiejiPirkimai/7346201.json)

| API Field                                         | Produces                                  | Entity/Edge Type         | Mapping                                                                                                        |
|---------------------------------------------------|-------------------------------------------|--------------------------|----------------------------------------------------------------------------------------------------------------|
| root                                              | **TenderEntity**                          | Tender                   | `pirkimoId` → uuid, `pavadinimas` → name, `paskelbimoData` → fromDate, `pasiulymuPateikimoTerminas` → tillDate |
| `jarKodas` + `vykdytojoPavadinimas`               | **OrganizationEntity** (procuring entity) | Institution              | `jarKodas` → uuid, `pavadinimas` → name                                                                        |
| `sutartys[]`                                      | **ContractRelationship** (ref)            | links Tender → Contracts | contract IDs under this tender                                                                                 |
| `numatomaBendraPirkimoVerte` / `numatomaVerteEUR` | enriches **TenderEntity**                 | —                        | estimated total value                                                                                          |

### Entity Discovery Chain

The graph is populated progressively. Starting from a single `asmuo`, the system discovers related entities:

```mermaid
flowchart TD
    A["1. Fetch asmuo/{jarKodas}"] --> B["OrganizationEntity\n+ PersonEntities\n+ Relationship edges"]
    B --> C{"Discover related\norganization jarKodas\nfrom sutartys.topPirkejai\nand topTiekejai"}
    C --> D["2. Fetch asmuo/{relatedJarKodas}\nfor each discovered org"]
    D --> E["Expand graph with\nnew orgs + people + edges"]
    B --> F{"Discover contract IDs\n(via search or\npirkimas.sutartys)"}
    F --> G["3. Fetch sutartis/{id}\nfor individual contracts"]
    G --> H["Add Contract edges\nwith value + dates"]
    H --> I{"pirkimoNumeris\nnot null?"}
    I -->|yes| J["4. Fetch viesiejiPirkimai/{id}"]
    J --> K["Add TenderEntity\n+ link to contracts"]
    I -->|no| L["Skip tender\n(MVP contract)"]
```

## Staging Storage

### Staging Storage Population Flow

The staging layer is populated **on-demand** when a user expands a node in the graph. The service checks whether
fresh staging data exists before calling viespirkiai.org, then parses the raw JSON into the normalized graph store.

```mermaid
sequenceDiagram
    participant GUI as RIS GUI
    participant Service as RIS Service
    participant Staging as Staging Tables
    participant API as Viespirkiai.org API
    participant Graph as Graph Store<br/>(Entity + Relationship)
    Note over GUI: User clicks an Organization node (jarKodas)
    GUI ->> Service: GET /api/v1/graph/expand/{jarKodas}
%% Step 1: Check staging freshness
    Service ->> Staging: SELECT * FROM StagingAsmuo WHERE jarKodas = ?
    alt Staging row missing or stale (fetchedAt > TTL)
        Service ->> API: GET /asmuo/{jarKodas}.json
        API -->> Service: Raw asmuo JSON
        Service ->> Staging: UPSERT StagingAsmuo (jarKodas, data, fetchedAt=now)
    else Staging data is fresh
        Staging -->> Service: Cached asmuo JSON
    end

%% Step 2: Parse staging → graph store
    Service ->> Staging: Read StagingAsmuo.data
    Note over Service: Parse jar → Entity (Org)<br/>Parse pinreg.darbovietes → Entity (Person) + Relationship<br/>Parse pinreg.sutuoktinioDarbovietes → Entity × 2 + Relationships<br/>Parse pinreg.rysiaiSuJa → Entity (Person) + Relationship
    Service ->> Graph: UPSERT Entity rows (org + persons)
    Service ->> Graph: UPSERT Relationship rows (employment, director, spouse, ...)
%% Step 3: Discover and fetch related contracts
    Note over Service: Discover contract partner jarKodas<br/>from sutartys.topPirkejai / topTiekejai
    loop For each discovered contract partner (if not in staging)
        Service ->> API: GET /asmuo/{partnerJarKodas}.json
        API -->> Service: Raw partner JSON
        Service ->> Staging: UPSERT StagingAsmuo
        Service ->> Graph: UPSERT partner Entity + Relationships
    end

%% Step 4: Query and return expanded subgraph
    Service ->> Graph: SELECT entities + relationships WHERE sourceId=? OR targetId=?
    Graph -->> Service: Expanded subgraph rows
    Service ->> GUI: Return Cytoscape.js elements { nodes, edges, meta }
    Note over GUI: Cytoscape renders new nodes + edges around clicked node
```

#### Freshness TTL Strategy

| Staging Table     | TTL      | Rationale                                                |
|-------------------|----------|----------------------------------------------------------|
| `StagingAsmuo`    | 24 hours | Employee/governance data changes infrequently            |
| `StagingSutartis` | 7 days   | Contract data is essentially immutable after publication |
| `StagingPirkimas` | 24 hours | Active tenders may update (new bids, status changes)     |

### Staging Storage Schema

```prisma
model StagingAsmuo {
  jarKodas     String    @id
  data         Json      
  fetchedAt    DateTime  @default(now())
  deprecatedAt DateTime? 
}

model StagingSutartis {
  sutartiesUnikalusID String    @id
  data                Json      
  fetchedAt           DateTime  @default(now())
  deprecatedAt        DateTime? 
}

model StagingPirkimas {
  pirkimoId    String    @id
  data         Json      
  fetchedAt    DateTime  @default(now())
  deprecatedAt DateTime? 
}
```

## Components

### Graph Component

**Nodes:**

| Entity             | Node/Entity Type | Node Label  | Node Size  | Node Color (TBC)    | Node Icon        |
|--------------------|------------------|-------------|------------|---------------------|------------------|
| OrganizationEntity | PrivateCompany   | pavadinimas | log(verte) | risk score gradient | `Business`       |
| OrganizationEntity | PublicCompany    | pavadinimas | log(verte) | risk score gradient | `DomainAdd`      |
| OrganizationEntity | Institution      | pavadinimas | fixed size | fixed color         | `AccountBalance` |
| PersonEntity       | Person           | name        | fixed size | risk score gradient | `Person`         |
| TenderEntity       | Tender           | pavadinimas | log(verte) | risk score gradient | `Assignment`     |

**Edges:**

| Entity               | Relationship Type | Edge Label | Edge Width  | Edge Color (TBC)    | Edge Style |
|----------------------|-------------------|------------|-------------|---------------------|------------|
| ContractRelationship | Contract          | verte      | log(verte)  | risk score gradient | solid      |
| Relationship         | (others)          | role       | fixed width | risk score gradient | dashed     |

**Graph Data Model:**

TBC

**Edge Types:**

TBC

### Filter Component

Top App Bar Component with:

- [ ] Search input (entity name or ID)
- [ ] Year range slider (yearFrom, yearTo)
- [ ] Contract value slider (minValue)

### Node Details Component

TBC

### Edge Details Component

TBC

---

## Repository Structure (Single-Root Decoupled)

The following tree defines the mandatory structure to maintain logical separation while using a single `package.json`.

```text
risk-intelligence/
├── .github/
│   └── workflows/
│       └── etl-scraper.yml      # Nightly ETL Runner
├── cypress/                     # E2E & GUI Testing (Specs, Screenshots, Videos)
├── prisma/                      # Database Schema & Migrations
├── public/                      # Static Assets
├── src/
│   ├── app/                     # App Router (Next.js Entry)
│   │   ├── api/                 # Stateless API Route Handlers
│   │   │   ├── v1/graph/        # [GET] /expand/{entityId} — graph expansion
│   │   │   └── v1/entity/       # [GET] /{entityId} — 360 detail view
│   │   ├── layout.tsx           # Global Shell & Theme Provider
│   │   ├── page.tsx             # SINGLE UI ENTRY POINT — manages hash routing
│   │   └── globals.css          # Global Styles
│   ├── components/              # Modular Client UI Components
│   │   ├── graph/               # Cytoscape.js Logic
│   │   └── entity/              # EntityDetailView component (rendered via hash route)
│   ├── lib/                     # Business Logic (Risk Rules, DB Client)
│   │   └── useHashRouter.ts     # Hash-based routing hook (SSR-safe)
│   ├── types/                   # Shared TypeScript Interfaces
│   └── services/                # API Client Wrappers
├── docker-compose.yml           # Local Postgres ONLY
├── package.json                 # SINGLE ROOT PACKAGE
├── tsconfig.json
└── ARCHITECTURE.md
```

---

## API Design

### Core Endpoints

```
GET  /api/v1/graph/expand/{entityId}?depth=1&yearFrom=&yearTo=&minValue=
GET  /api/v1/entity/{entityId}
```

#### `GET /api/v1/graph/expand/{entityId}`

**Purpose:** Expand the graph around a given entity. This is the primary endpoint powering both the initial page load
and every subsequent node-click expansion.

**Behaviour:**

1. Ensure staging data is fresh (fetch from viespirkiai if stale/missing — see Staging Population Flow)
2. Parse staging JSON → Entity + Relationship tables (idempotent upserts)
3. Query the graph store for the 1-hop neighbourhood of `entityId`
4. Apply filters (yearFrom/yearTo on Relationship.fromDate, minValue on Contract.data.verte)
5. Return Cytoscape.js-compatible response

**Parameters:**

| Param      | Type  | Default  | Description                                                                     |
|------------|-------|----------|---------------------------------------------------------------------------------|
| `entityId` | path  | required | Entity UUID (jarKodas for orgs, deklaracija for persons, pirkimoId for tenders) |
| `depth`    | query | `1`      | How many hops from the anchor to include (v1: always 1)                         |
| `yearFrom` | query | —        | Filter relationships starting from this year                                    |
| `yearTo`   | query | —        | Filter relationships ending before this year                                    |
| `minValue` | query | —        | Minimum contract value (EUR) for Contract edges                                 |

**Initial page load:** `GET /api/v1/graph/expand/110053842?depth=1`

#### `GET /api/v1/entity/{entityId}`

**Purpose:** Return the full 360-degree detail view for a single entity (metadata, all relationships, summary stats).
Used when the user clicks a node to see its detail panel.

### Graph Response Format (Cytoscape.js-compatible)

```json
{
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "110053842",
          "label": "AB Lietuvos geležinkeliai",
          "type": "PublicCompany",
          "employees": 122,
          "totalContractValue": 5200000
        }
      },
      {
        "data": {
          "id": "026a8bda-cae8-49a8-b812-e1a1b88827d7",
          "label": "ALEKSANDRAS ZUBRIAKOVAS",
          "type": "Person"
        }
      }
    ],
    "edges": [
      {
        "data": {
          "id": "rel-026a8bda-110053842-Director",
          "source": "026a8bda-cae8-49a8-b812-e1a1b88827d7",
          "target": "110053842",
          "type": "Director",
          "label": "Korporatyvinių reikalų direktorius",
          "fromDate": "2023-09-25"
        }
      },
      {
        "data": {
          "id": "rel-2008059225",
          "source": "302296711",
          "target": "302444074",
          "type": "Contract",
          "label": "1200 EUR",
          "verte": 1200,
          "fromDate": "2026-04-12",
          "tillDate": "2026-07-07"
        }
      }
    ]
  },
  "meta": {
    "anchorId": "110053842",
    "totalNodes": 2,
    "totalEdges": 2,
    "depth": 1,
    "generatedAt": "2026-04-13T12:00:00Z"
  }
}
```

---

## Storage Design

The system uses a **two-layer storage** architecture:

| Layer           | Purpose                                                 | Tables                                               | Populated by               |
|-----------------|---------------------------------------------------------|------------------------------------------------------|----------------------------|
| **Staging**     | Cache of raw viespirkiai.org JSON responses             | `StagingAsmuo`, `StagingSutartis`, `StagingPirkimas` | Fetch from viespirkiai API |
| **Graph Store** | Normalized entities and relationships for graph queries | `Entity`, `Relationship`                             | Parsed from staging data   |

Staging is the **raw data cache** — immutable JSON blobs fetched from viespirkiai.org.
Graph Store is the **query-optimized projection** — normalized rows derived from staging, serving the API.

```mermaid
flowchart LR
    V["viespirkiai.org API"] -->|" raw JSON "| S["Staging Tables\n(JSON blobs)"]
    S -->|" parse & normalize "| G["Graph Store\n(Entity + Relationship)"]
    G -->|" query "| A["API endpoints\n→ Cytoscape.js"]
```

### Graph Store Schema (PostgreSQL / Prisma)

```prisma
model Entity {
  id            String    @id // jarKodas | deklaracija UUID | pirkimoId
  type          String    // PrivateCompany | PublicCompany | Institution | Person | Tender
  name          String    
  fromDate      DateTime? 
  tillDate      DateTime? 
  dataReference String?   // staging FK (jarKodas, pirkimoId) — null for Person
  data          Json?     // extra metadata (employees, avgSalary, verte, etc.)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  outgoing Relationship[] @relation("source")
  incoming Relationship[] @relation("target")

  @@index([type])
}

model Relationship {
  id            String    @id @default(cuid())
  type          String    // Contract | Employment | Director | Official | Spouse | Shareholder
  name          String?   // display label (e.g. "Vadovas", "1200 EUR")
  fromDate      DateTime? 
  tillDate      DateTime? 
  dataReference String?   // staging FK (sutartiesUnikalusID) — null for non-Contract
  data          Json?     // extra metadata (verte, pareigos, etc.)

  sourceId String 
  targetId String 
  source   Entity @relation("source", fields: [sourceId], references: [id])
  target   Entity @relation("target", fields: [targetId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([type, sourceId, targetId, fromDate]) // prevent duplicate edges
  @@index([sourceId])
  @@index([targetId])
  @@index([type])
}
```

### Staging → Graph Store Parse Rules

When staging data is parsed into the graph store, the following rules apply:

| Staging Source                                      | → Entity                                   | → Relationship(s)                                                                                                         |
|-----------------------------------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `StagingAsmuo.data.jar`                             | `Entity(type=Org*, id=jarKodas)`           | —                                                                                                                         |
| `StagingAsmuo.data.pinreg.darbovietes[]`            | `Entity(type=Person, id=deklaracija)`      | `Relationship(type=Employment/Director/Official, source=Person, target=Org)`                                              |
| `StagingAsmuo.data.pinreg.sutuoktinioDarbovietes[]` | `Entity(type=Person)` × 2                  | `Relationship(type=Spouse, source=declarant, target=spouse)` + `Relationship(type=Employment, source=spouse, target=Org)` |
| `StagingAsmuo.data.pinreg.rysiaiSuJa[]`             | `Entity(type=Person, id=deklaracija)`      | `Relationship(type=Director/Shareholder/Official, source=Person, target=Org)`                                             |
| `StagingSutartis.data`                              | `Entity(type=Org*)` × 2 (buyer + supplier) | `Relationship(type=Contract, source=buyer, target=supplier)`                                                              |
| `StagingPirkimas.data`                              | `Entity(type=Tender, id=pirkimoId)`        | — (Tender links to Contracts via Contract.data.pirkimoNumeris)                                                            |

All upserts are **idempotent** — re-parsing the same staging row produces no duplicates (ensured by the unique
constraint on Relationship and the primary key on Entity).

```