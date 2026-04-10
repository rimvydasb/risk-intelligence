# Entity Details Panel — GUI Specification

**Version:** 1.0-DRAFT  
**Date:** 2026-04-10  
**Status:** Draft  
**Relates to:
** [ARCHITECTURE.md §4 Use Cases](./ARCHITECTURE.md#4-use-cases), [§5 Risk Scoring Model](./ARCHITECTURE.md#5-risk-scoring-model-the-inference-engine), [§10 Cytoscape.js Visualization Layer](./ARCHITECTURE.md#10-cytoscapejs-visualization-layer)

---

## 1. Purpose

This document specifies the GUI for the **Entity Details view** — the 360° profile surface shown when an analyst
inspects a node in the Biological Interaction Network graph.

The current implementation shows only a name, ID, type, and a single risk score number. The viespirkiai.org API (
`GET /asmuo/{jarKodas}.json`) exposes rich multi-source data that must be surfaced to support all five use cases defined
in [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-use-cases):

| Use Case                              | Key Data Gap in Current UI                    |
|---------------------------------------|-----------------------------------------------|
| UC-01: Bid Rigging / Cartel Detection | No contract history or co-bidder frequency    |
| UC-02: Shell Company Detection        | No substance metrics (employees, salary, age) |
| UC-03: PEP / Conflict of Interest     | No ownership chain or role information        |
| UC-04: Subcontractor Money Laundering | No value flow breakdown                       |
| UC-05: EU Double-Dipping              | No contract type or CPV code visibility       |

---

## 2. Data Sources

All fields in this spec are sourced from the viespirkiai.org API
per [ARCHITECTURE.md §2.1](./ARCHITECTURE.md#21-viespirkiaiorg-api). No new external calls are needed.

```
GET https://viespirkiai.org/asmuo/{jarKodas}.json
```

Top-level response sections used by this spec:

| API Section                   | Content                                                                         | Risk Use Case                 |
|-------------------------------|---------------------------------------------------------------------------------|-------------------------------|
| `jar`                         | Company Registry: name, address, registration date, legal form, status          | UC-02 (company age), identity |
| `sodra`                       | SODRA (Social Insurance): employees, avg salary, contributions, monthly history | UC-02 (substance check)       |
| `sodra.duomenys[]`            | Monthly time series since 2018: employee count, salary, contributions           | UC-02 (workforce trend)       |
| `sutartys.pirkimaiKasMetus[]` | Annual spend as a buyer (EUR), per year                                         | UC-04 (money flow)            |
| `sutartys.tiekimaiKasMetus[]` | Annual contract wins as a supplier (EUR), per year                              | UC-01, UC-02                  |
| `sutartys.topPirkejai[]`      | Top entities that bought from this company                                      | UC-04, UC-01                  |
| `teismoNuosprendziai`         | Court rulings: count, case types, roles, court names                            | UC-03 (legal exposure)        |
| `regitra`                     | Vehicle fleet: total count, vehicle types                                       | UC-02 (physical substance)    |

---

## 3. Two-Surface Layout

The Entity Details surface is displayed in two contexts. Both surfaces share the same data model but differ in screen
space.

### 3.1 Slide-Out Panel (Graph Overlay)

Triggered by clicking a node in the Biological Interaction Network
canvas ([ARCHITECTURE.md §10.3](./ARCHITECTURE.md#103-interaction-design)). Shown as a right-anchored drawer, 400px
wide, overlaid on the graph.

**Design rule:** Must not navigate away from the graph canvas. An analyst must be able to inspect an entity and return
to graph traversal without losing context.

Contains **compact versions** of all sections. Includes a **"View Full Profile →"** link to the 360° page.

### 3.2 360° Full Profile Page (`/entities/[id]`)

Full-page view accessible from the slide-out panel or direct URL. Shows expanded versions of all sections including
charts and tables with pagination.

---

## 4. Section Specifications

Sections are ordered by analytical priority — highest risk signal density first.

---

### Section 1 — Identity Header

**Purpose:** Immediately establish who this entity is and whether it is currently active.

| Field               | Source                                       | Display                                                       |
|---------------------|----------------------------------------------|---------------------------------------------------------------|
| Full legal name     | `jar.pavadinimas`                            | H1 heading                                                    |
| Registry code (JAR) | `jar.jarKodas`                               | Subtitle, monospace                                           |
| Legal form          | `jar.formosPavadinimas`                      | Badge (e.g., "Akcinė bendrovė")                               |
| Registration date   | `jar.registravimoData`                       | "Registered: 1991-12-24 (34 years ago)"                       |
| Legal status        | `jar.statusoPavadinimas` + `jar.statusasNuo` | Status chip: green = active, red = liquidated, grey = dormant |
| Registered address  | `jar.adresas`                                | Single line                                                   |
| Data freshness      | `jar.duomenuData`                            | "Data as of: 2026-01-27"                                      |
| External link       | Derived from `jar.jarKodas`                  | Link: `viespirkiai.org/asmuo/{jarKodas}`                      |

**Risk signal:** If `jar.statusoPavadinimas` indicates liquidated or suspended status after a large contract — flag with
`⚠ Status changed after contract`.

---

### Section 2 — Risk Score & Active Flags

**Purpose:** Surface the composite risk score and each contributing signal so an analyst can understand *why* a score
was assigned, not just what it is. Supports the "Flag Fatigue" mitigation described
in [ARCHITECTURE.md §5.2](./ARCHITECTURE.md#52-scoring-rules--multipliers).

#### 2.1 Score Dial

Display the `displayScore` (log2-scaled as per [ARCHITECTURE.md §5.3](./ARCHITECTURE.md#53-composite-scoring-formula))
with a colour band:

| Display Score | Band     | Node Colour   | Action Required        |
|---------------|----------|---------------|------------------------|
| 0–49          | None     | Grey          | No action              |
| 50–99         | Minor    | Green         | Monitor                |
| 100–149       | Moderate | Yellow        | Manual review required |
| 150–199       | High     | Orange        | Alert triggered        |
| 200+          | Critical | Red (pulsing) | Escalate immediately   |

Show raw integer score alongside display score: `Display: 47 (Raw: 25.5)`.

#### 2.2 Active Flag List

Each active flag is shown as a coloured chip with its score contribution. Flags map directly to the signals defined
in [ARCHITECTURE.md §4 (UC-02)](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection)
and [§15.2](./ARCHITECTURE.md#152-uc-2-shell-company-feniksai-identification):

| Flag                     | Trigger Condition                                                                                             | Score   | Severity    |
|--------------------------|---------------------------------------------------------------------------------------------------------------|---------|-------------|
| `CRITICAL_WORKFORCE`     | `employees < 2`                                                                                               | +50     | 🔴 Critical |
| `DISPROPORTIONATE_VALUE` | `employees < 5 AND totalContractValue > €500k`                                                                | +30     | 🟠 High     |
| `FRESHLY_REGISTERED`     | Company age < 6 months at first contract date                                                                 | +80     | 🔴 Critical |
| `NON_ADVERTISED_WIN`     | Any contract with `tipas = "MVP"`                                                                             | +80     | 🔴 Critical |
| `BLACKLISTED`            | Entity on VPT blacklist                                                                                       | +100    | 🚨 Critical |
| `NO_SODRA_DATA`          | `sodra` section entirely absent                                                                               | +40     | 🟠 High     |
| `CARTEL_CLUSTER`         | Member of a detected co-bid cluster ([UC-01](./ARCHITECTURE.md#uc-01-bid-rigging--cartel-detection))          | +60     | 🔴 Critical |
| `WIN_ROTATION`           | Confirmed rotational win pattern                                                                              | +40     | 🟠 High     |
| `PEP_CONNECTION`         | Path distance ≤ 3 to a public official ([UC-03](./ARCHITECTURE.md#uc-03-pep--conflict-of-interest-detection)) | +60–100 | 🔴 Critical |
| `CIRCULAR_OWNERSHIP`     | Shareholder structure loops back to self                                                                      | +90     | 🔴 Critical |
| `LARGE_SUBCONTRACT_FLOW` | > 80% contract value passed to single subcontractor                                                           | +70     | 🔴 Critical |

If no flags are active, display: `✓ No active risk signals detected`.

---

### Section 3 — Substance Metrics (Shell Detection)

**Purpose:** Directly
supports [UC-02 (Shell Company Detection)](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection). The ratio of
contract value to operational capacity is the primary shell company signal.

#### 3.1 Current Snapshot (from latest `sodra` record)

| Metric                          | Source Field                  | Display                           |
|---------------------------------|-------------------------------|-----------------------------------|
| Insured employees               | `sodra.draustieji`            | Large number, coloured red if < 5 |
| Average monthly salary (EUR)    | `sodra.vidutinisAtlyginimas`  | Formatted currency                |
| Monthly social contributions    | `sodra.imokuSuma`             | Formatted currency                |
| Total salary expenses (monthly) | `sodra.atlyginimuIslaidos`    | Formatted currency                |
| Report period                   | `sodra.data`                  | "as of 2026-02"                   |
| Board/management employees      | `sodra.draustieji2`           | Shown separately if non-null      |
| Board avg salary                | `sodra.vidutinisAtlyginimas2` | Shown separately if non-null      |

**Derived metric — Substance Ratio:**

```
substanceRatio = totalLifetimeContractValue / (employees * avgSalary * 12)
```

Display as: `Contract Value / Annual Payroll = 142× ⚠` — values above 10× are flagged.

#### 3.2 Workforce Trend Chart

Source: `sodra.duomenys[]` (monthly history from 2018 onward, sorted by `data`).

- **Chart type:** Line chart (employees over time) + optional bar overlay for `imokuSuma`.
- **X-axis:** Month/year.
- **Y-axis:** Employee count.
- **Annotations:**
    - Mark each year where a contract was signed as a vertical line.
    - Mark sudden drops (>50% reduction in a single month) with a `⚠ WORKFORCE DROP` marker — a key shell-company
      indicator.
- **Example insight (AB Lietuvos geležinkeliai):** Employee count dropped from 7,416 in 2018-01 to 122 by 2026-02,
  indicating a major corporate restructuring via spin-offs into subsidiaries (LTG Cargo, LTG Infra, LTG Link — visible
  in `sutartys.topPirkejai`).

In the **slide-out panel**: show a sparkline (last 12 months only) with current count highlighted. Full chart on the
360° page.

---

### Section 4 — Procurement Footprint

**Purpose:** Show the entity's role in Lithuanian public procurement.
Informs [UC-01 (Cartel Detection)](./ARCHITECTURE.md#uc-01-bid-rigging--cartel-detection)
and [UC-02 (Shell Detection)](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection).

#### 4.1 Annual Spend Summary

Two separate totals side-by-side:

| Metric                  | Source                            | Description                            |
|-------------------------|-----------------------------------|----------------------------------------|
| Total as Buyer (EUR)    | `sutartys.pirkimaiKasMetus[]` sum | Public money spent by this entity      |
| Total as Supplier (EUR) | `sutartys.tiekimaiKasMetus[]` sum | Contracts won from public institutions |

**Chart type (360° page):** Grouped bar chart by year showing both buyer and supplier volumes. Sudden spikes in supplier
revenue with no workforce increase are a shell detection
signal ([UC-02](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection)).

In the **slide-out panel**: show lifetime totals as two large KPI numbers with trend arrows (increasing/decreasing vs.
prior year).

#### 4.2 Top Counterparties

Source: `sutartys.topPirkejai[]`.

Show as a ranked list:

| # | Entity Name    | Total (EUR)  | Contract Count | Action            |
|---|----------------|--------------|----------------|-------------------|
| 1 | AB "LTG Cargo" | €432,081,948 | 79             | [Expand in Graph] |
| 2 | AB "LTG Infra" | €160,376,788 | 32             | [Expand in Graph] |

Each row's **[Expand in Graph]** button triggers a 1-hop expansion in the Cytoscape canvas, centred on the relationship
between the two entities.

In the **slide-out panel**: show top 3 only.

#### 4.3 Contract Type Breakdown

Source: derived from individual contract records.

Show counts/percentages of:

- Advertised (open tender)
- Non-advertised (`tipas = "MVP"`) — **high-risk signal**
  per [ARCHITECTURE.md §15.2](./ARCHITECTURE.md#152-uc-2-shell-company-feniksai-identification)
- Simplified / small-value

---

### Section 5 — Legal Exposure (Court Records)

**Purpose:** Court rulings signal disputes, sanctions, and prior fraudulent behaviour. Directly relevant
for [UC-02 (Shell Detection)](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection)
and [UC-03 (PEP)](./ARCHITECTURE.md#uc-03-pep--conflict-of-interest-detection).

Source: `teismoNuosprendziai`.

#### 5.1 Summary Bar

```
853 court records  |  Civil: 612  |  Administrative: 241  |  Roles: Defendant: 210 | Plaintiff: 180 | Third Party: 463
```

Key counters:

- Total cases (`teismoNuosprendziai.rows`)
- Count where `bylojeKaip = "Atsakovas"` (Defendant) — highest risk signal
- Count where `bylosRusis = "Baudžiamoji byla"` (Criminal) — flag immediately

#### 5.2 Recent Cases Table (360° page, last 10)

| Date       | Case Number    | Court         | Type  | Role          | Citation Count | Document |
|------------|----------------|---------------|-------|---------------|----------------|----------|
| 2025-12-12 | eCIK-1130/2025 | Supreme Court | Civil | **Defendant** | 12             | [View]   |

Source fields: `bylosNumeris`, `bylosRusis`, `data`, `teismas`, `bylojeKaip`, `citavimasKitoseBylose`, `fileHref`.

- Colour `bylojeKaip = "Atsakovas"` (Defendant) rows in orange/red.
- High `citavimasKitoseBylose` (citation count in other cases) indicates systemic significance.

In the **slide-out panel**: show only the 3 most recent cases and the defendant count badge.

---

### Section 6 — Ownership & Relationships

**Purpose:** Supports [UC-03 (PEP / Conflict of Interest)](./ARCHITECTURE.md#uc-03-pep--conflict-of-interest-detection)
and [UC-04 (Subcontractor Laundering)](./ARCHITECTURE.md#uc-04-subcontractor-money-laundering-path). Shows the immediate
network neighbourhood.

Source: internal graph database (`PersonRelationship` table via `/api/entities/{jarKodas}`).

#### 6.1 Persons Connected to this Entity

List of `Person` nodes linked via `PersonRelationship` edges:

| Name          | Role        | Risk Score | Action          |
|---------------|-------------|------------|-----------------|
| [Person Name] | Owner (UBO) | 🟡 120     | [View in Graph] |
| [Person Name] | CEO         | ⚪ 20       | [View in Graph] |

Roles from [ARCHITECTURE.md §6.1](./ARCHITECTURE.md#61-node-types): `owner`, `ceo`, `ubo`.

- **PEP badge** shown if the person has any `EMPLOYED_AT` edge to a public institution.
- **Distance-to-contract badge:** If a path of length ≤ 3 exists from this person to a contract buyer, show
  `⚠ Potential conflict of interest`.

#### 6.2 Related Companies

List of companies sharing ownership or management with this entity (via shared `Person` nodes). Critical
for [UC-04 circular ownership detection](./ARCHITECTURE.md#uc-04-subcontractor-money-laundering-path).

In the **slide-out panel**: show count + one "View Ownership Network" button that expands a subgraph in the Cytoscape
canvas.

---

### Section 7 — Physical Substance (Fleet)

**Purpose:** Fleet data from Regitra is a secondary substance indicator
for [UC-02](./ARCHITECTURE.md#uc-02-shell-company--fronting-detection). A company with €50M in contracts but no
registered vehicles has lower operational credibility.

Source: `regitra`.

#### 7.1 Fleet Summary

```
266 registered vehicles  (showing 5 of 266)
```

- Total count from `regitra.rows`.
- Category breakdown: Passenger (M1), Light commercial (N1), Heavy (N2/N3).
- Ownership type: owned (`valdymoTeise = "S"`) vs. leased/managed (`valdymoTeise = "V"`).

In the **slide-out panel**: show only the total count as a single line: `🚗 Fleet: 266 vehicles registered`.

On the **360° page**: show a summary table of the first 5 vehicles with make, model, and registration year. Link to full
list.

---

### Section 8 — Navigation Actions

Always visible at the bottom of both surfaces:

| Action                  | Behaviour                                                                                                                                 |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **Expand in Graph**     | Loads 1-hop neighbours from `/api/entities/{jarKodas}/network?depth=1` and re-renders the Cytoscape canvas centred on this node           |
| **Find Path to…**       | Opens a path-finder modal: enter another entity, triggers `POST /api/graph/path` ([ARCHITECTURE.md §11](./ARCHITECTURE.md#11-api-design)) |
| **View Full Profile →** | Navigates to `/entities/{jarKodas}` (slide-out panel only)                                                                                |
| **Export JSON**         | Downloads the raw `/api/entities/{jarKodas}` response                                                                                     |
| **Flag for Review**     | Marks the entity as under manual investigation (local state, future: server-side)                                                         |

---

## 5. Wireframe: Slide-Out Panel (400px)

```
┌─────────────────────────────────────────────┐
│ [←] Entity Details                      [✕] │
├─────────────────────────────────────────────┤
│ AB "Lietuvos geležinkeliai"                  │
│ JAR: 110053842  ·  Akcinė bendrovė           │
│ Registered: 1991-12-24 (34 yrs)             │
│ Vilnius, Geležinkelio g. 16                  │
│ ● Active  [viespirkiai.org ↗]               │
├─────────────────────────────────────────────┤
│ RISK SCORE                                   │
│  ┌──────────────────────────────────────┐   │
│  │  47  ████░░░░░░  GREEN — Monitor     │   │
│  │  Raw: 25.5    No active flags ✓      │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ SUBSTANCE (SODRA — 2026-02)                  │
│  Employees:          117  ⚠ (was 7,416)     │
│  Avg Salary:         €5,066/mo              │
│  Monthly Contribs:   €141,131               │
│  [Workforce Sparkline: ▅▅▅▄▃▂▂▁▁▁▁▁]        │
├─────────────────────────────────────────────┤
│ PROCUREMENT                                  │
│  Lifetime Buyer:     €2.47B  ↑              │
│  Lifetime Supplier:  €676M   ↓              │
│  Top Buyer: LTG Cargo (€432M, 79 contracts) │
├─────────────────────────────────────────────┤
│ LEGAL EXPOSURE                               │
│  853 court records  |  Defendant: 210       │
│  Recent: eCIK-1130/2025 (Civil, Defendant)  │
├─────────────────────────────────────────────┤
│ FLEET:  266 vehicles                        │
├─────────────────────────────────────────────┤
│ [Expand in Graph]  [Find Path to…]           │
│ [Flag for Review]  [View Full Profile →]    │
└─────────────────────────────────────────────┘
```

---

## 6. Wireframe: 360° Full Profile Page (`/entities/[id]`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Graph                                                  │
│                                                                  │
│  AB "Lietuvos geležinkeliai"                    [Export JSON]   │
│  110053842  ·  Akcinė bendrovė  ·  ● Active                     │
│  Vilnius, Geležinkelio g. 16  ·  Since 1991-12-24               │
│                                                                  │
├──────────────────────────────────────────────────────────────┬──┤
│ RISK SCORE: 47  █████░░░░░░  GREEN                           │  │
│ No active flags ✓                                            │  │
├─────────────────────────────────────┬────────────────────────┤  │
│ SUBSTANCE                           │ PROCUREMENT            │  │
│ ┌──────────────────────────────┐    │ Buyer:  €2.47B total   │  │
│ │ [Employee trend chart]       │    │ Supplier: €676M total  │  │
│ │ 2018: 7,416 → 2026: 117     │    │ [Bar chart by year]    │  │
│ │ ⚠ Workforce drop 2019-05    │    │                        │  │
│ └──────────────────────────────┘    │ Top Counterparties:    │  │
│ Avg Salary: €5,066   Contrib: €141k │ 1. LTG Cargo  €432M   │  │
│                                     │ 2. LTG Infra  €160M   │  │
│                                     │ 3. LTG Link   €93M    │  │
├─────────────────────────────────────┴────────────────────────┤  │
│ LEGAL EXPOSURE (853 records)                                 │  │
│ Defendant: 210  |  Plaintiff: 180  |  Third party: 463       │  │
│ ┌───────────────────────────────────────────────────────┐    │  │
│ │ Date       Case          Court          Role   Cit.   │    │  │
│ │ 2025-12-12 eCIK-1130     Supreme Court  DEF    12 [↗] │    │  │
│ │ 2025-10-28 e2A-1940-614  Vilnius Co.    DEF    24 [↗] │    │  │
│ │ 2025-10-16 e2-906-790    Appeal Court   DEF    12 [↗] │    │  │
│ └───────────────────────────────────────────────────────┘    │  │
│ [Load more…]                                                 │  │
├──────────────────────────────────────────────────────────────┤  │
│ OWNERSHIP & RELATIONSHIPS                                    │  │
│ [Ownership mini-graph embedded]                              │  │
│ Persons: [CEO badge] [Owner badge] [UBO badge]               │  │
├──────────────────────────────────────────────────────────────┤  │
│ FLEET (266 vehicles)                                         │  │
│ VW Caddy M1 · VW Crafter N1 · Mitsubishi L200 N1 · [+263]   │  │
└──────────────────────────────────────────────────────────────┘  │
```

---

## 7. Data Not Yet in Local DB

The following fields from the API are not currently persisted in the Prisma schema and will require ETL enrichment
before they can be displayed:

| Field                     | API Path                                            | Required For                        | Priority |
|---------------------------|-----------------------------------------------------|-------------------------------------|----------|
| SODRA monthly history     | `sodra.duomenys[]`                                  | Workforce trend chart (§3.2)        | High     |
| Annual procurement totals | `sutartys.pirkimaiKasMetus[]`, `tiekimaiKasMetus[]` | Procurement footprint charts (§4.1) | High     |
| Top counterparties        | `sutartys.topPirkejai[]`                            | Counterparty table (§4.2)           | High     |
| Court records             | `teismoNuosprendziai`                               | Legal exposure section (§5)         | Medium   |
| Vehicle fleet count       | `regitra.rows`                                      | Physical substance (§7)             | Low      |
| Registered address        | `jar.adresas`                                       | Identity header (§1)                | Low      |
| Legal form                | `jar.formosPavadinimas`                             | Identity header (§1)                | Low      |
| GPS coordinates           | `jar.location`                                      | Optional map pin                    | Low      |

Until these fields are ingested, the sections may render with a `Data not yet available — pending ETL enrichment`
placeholder.

---

## 8. Implementation Notes

- The slide-out panel is implemented in `src/app/page.tsx` as a MUI `Drawer` (right-anchored, 400px).
- The 360° page is `src/app/entities/[id]/page.tsx`.
- All data is fetched via the internal API route `GET /api/entities/{jarKodas}` — which should be enriched to return the
  fields listed in §7.
- The workforce trend chart should use a lightweight library (e.g., `recharts` or `chart.js`) loaded dynamically to
  avoid SSR issues — same pattern as the Cytoscape lazy import in `GraphView.tsx`.
- Risk flags are computed server-side by `src/lib/risk-engine.ts` (`RiskEngine` class)
  per [ARCHITECTURE.md §7](./ARCHITECTURE.md#7-system-architecture--environment-parity). The flags array should be
  returned alongside the display score.
- The `substanceRatio` derived metric (§3.1) must be computed in `RiskEngine` and stored as a flag, not calculated
  client-side.
- Legal disclaimer per [ARCHITECTURE.md §13](./ARCHITECTURE.md#13-security-and-legal-considerations): all risk scores
  are probabilistic signals, not legal findings. Display a footer note on both surfaces: *"Risk scores are based on
  publicly available data (CC BY 4.0). They are probabilistic indicators, not legal determinations."*
