# Contract Date Enrichment Story

## Summary

The graph currently shows **aggregated contract edges** (`org:buyer → org:anchor`) derived from
`topPirkejai` / `topTiekejai` arrays in the `/asmuo/{jarKodas}.json` response. These edges carry
only a total value (`totalValue`) and **no date information** — making timeline filtering
impossible and the table view useless for temporal risk analysis.

The `Contract` table is also missing `fromDate` and `tillDate` columns even though this data is
available in the source.

### The Key Insight — Scrape HTML, Not JSON

The contract list HTML page for any buyer+supplier pair:

```
https://viespirkiai.org/?perkanciosiosOrganizacijosKodas=<buyer>&tiekejoKodas=<supplier>
```

already contains **everything we need** inside server-rendered `<article class="result-card …">`
elements — no individual `/sutartis/{id}.json` fetches are needed for graph painting:

| Field | Source in HTML |
|-------|---------------|
| `sutartiesUnikalusID` | `href="/sutartis/{id}"` |
| `name` | text after `<span class="amount">` inside `<h3>` |
| `fromDate` | first `<time datetime="…">` inside the _Sutarties galiojimas_ `<dd>` |
| `tillDate` | second `<time datetime="…">` inside the same `<dd>` (absent = same as fromDate) |
| `value` | `<span class="amount">` (numeric, needs cleaning of `&nbsp;` and `€`) |

Individual contract JSONs (`/sutartis/{id}.json`) are **not fetched during graph expansion**. They
can be lazily fetched when a user opens a contract detail panel (existing `fetchSutartis` is
already there for that).

### Pagination — walk all pages

- Each page returns **up to 50 articles** (server-rendered).
- Paginate with `?page=N&perkanciosiosOrganizacijosKodas=X&tiekejoKodas=Y` starting at `page=1`.
- **Stop when a page returns 0 articles.**
- For the default anchor (`110053842`), the largest pair produces ~2 pages (97 contracts). Most
  pairs fit on 1 page.

### Default Date Filter

When a node is first opened (no filter set), default to **last 12 months** of contracts:
- `yearFrom = currentYear - 1`
- `yearTo = currentYear`

This limits both what is scraped _displayed_ and what dominates the table view.

---

## Technical Breakdown

### New Data Structure — `ContractSummary`

```typescript
/** Scraped contract summary — no JSON blob needed for graph painting. */
interface ContractSummary {
  sutartiesUnikalusID: string;
  name: string;
  fromDate: string | null;  // ISO date, e.g. "2025-07-22"
  tillDate: string | null;  // ISO date, e.g. "2025-09-19"; null if single-day
  value: number | null;
}
```

### New Database Table — `StagingSutartisList`

Caches the scraped `ContractSummary[]` per buyer+supplier pair (TTL: 24 h).

```prisma
model StagingSutartisList {
  id           String   @id @default(cuid())
  buyerCode    String
  supplierCode String
  contracts    Json     // ContractSummary[]
  fetchedAt    DateTime

  @@unique([buyerCode, supplierCode])
  @@map("staging_sutartis_list")
}
```

### Structural Diagram

```mermaid
graph LR
  subgraph New
    A[fetchSutartisList\nclient.ts\nHTML scraper] -->|pages 1,2,…| B[viespirkiai.org\n/?buyer=X&supplier=Y]
    C[staging/sutartisList.ts\nStagingSutartisList] -->|ContractSummary\[\]| D
  end

  subgraph Existing
    E[fetchAsmuo\nclient.ts] --> F[viespirkiai.org\n/asmuo/{id}.json]
    G[StagingAsmuo] --> D[expandOrg\ngraph/expand.ts]
    H[parseSutartisSummary\nparsers/sutartis.ts] --> D
  end

  D -->|for each resolvable pair| A
  A --> C
  C -->|summaries| H
```

### Behavioral Diagram

```mermaid
sequenceDiagram
    participant API as GET /api/v1/graph/expand/[jarKodas]
    participant EXP as expandOrg()
    participant STGA as StagingAsmuo
    participant STGL as StagingSutartisList (new)
    participant VPK as viespirkiai.org

    API->>EXP: expandOrg(jarKodas, filters)
    EXP->>STGA: getAsmuo(jarKodas)
    alt cache miss
        EXP->>VPK: GET /asmuo/{jarKodas}.json
        EXP->>STGA: upsertAsmuo(...)
    end
    EXP->>EXP: parseAsmuo() → graph elements\n(aggregated Contract edges — temporary)

    loop for each resolvable buyer/supplier pair
        EXP->>STGL: getSutartisList(buyerCode, supplierCode)
        alt list cache miss
            loop page = 1, 2, … until empty
                EXP->>VPK: GET /?perkanciosiosOrganizacijosKodas=B\n&tiekejoKodas=S&page=N (HTML)
                EXP->>EXP: parse <article class="result-card"> elements\n→ ContractSummary[]
            end
            EXP->>STGL: upsertSutartisList(buyerCode, supplierCode, summaries)
        end

        EXP->>EXP: parseSutartisSummary(summaries, filters)\n→ contract nodes + edges with fromDate/tillDate
        EXP->>EXP: remove original aggregated Contract edge for this pair
    end

    EXP-->>API: ExpandResult (individual contracts with dates)
```

---

## Changes to Existing Components

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `StagingSutartisList` model |
| `src/lib/viespirkiai/types.ts` | Add `ContractSummary` type |
| `src/lib/viespirkiai/client.ts` | Add `fetchSutartisList(buyerCode, supplierCode): Promise<ContractSummary[]>` — HTML scraper with pagination |
| `src/lib/staging/sutartisList.ts` | New: `getSutartisList` / `upsertSutartisList` |
| `src/lib/parsers/sutartis.ts` | Add `parseSutartisSummary(summaries, filters)` — converts `ContractSummary[]` to Cytoscape nodes+edges |
| `src/lib/graph/expand.ts` | Post-parse enrichment: replace aggregated Contract edges with individual dated contract nodes/edges |
| `src/components/graph/GraphView.tsx` | Default `yearFrom = currentYear - 1`, `yearTo = currentYear` |
| `src/components/table/GraphDataTable.tsx` | Add `fromDate` and `tillDate` columns to the Contract rows |

---

## HTML Scraping Implementation Notes

### URL direction

| asmuo array | URL |
|-------------|-----|
| `topTiekejai` (anchor **buys from** partner) | `?perkanciosiosOrganizacijosKodas=<anchor>&tiekejoKodas=<partner>` |
| `topPirkejai` (partner **buys from** anchor) | `?perkanciosiosOrganizacijosKodas=<partner>&tiekejoKodas=<anchor>` |

### Parsing `<article>` elements

```typescript
// Pseudo-code for parsing one <article> block
const id = article.match(/href="\/sutartis\/(\d+)"/)?.[1];

// All <time> in the Sutarties galiojimas <dd>
const galiojimas = article.match(/Sutarties galiojimas[\s\S]*?<\/dd>/)?.[0] ?? '';
const times = [...galiojimas.matchAll(/<time datetime="([^"]+)"/g)].map(m => m[1]);
const fromDate = times[0] ?? null;
const tillDate = times[1] ?? null;        // null when single-day contract

// Value: strip &nbsp; and € then parse float
const rawValue = article.match(/<span class="amount[^"]*">\s*([^<]+)\s*<\/span>/)?.[1] ?? '';
const value = parseFloat(rawValue.replace(/[^\d,]/g, '').replace(',', '.')) || null;

// Title: text node after </span> in <h3>
const name = article.match(/<\/span>\s*([^\n<]+)\n/)?.[1]?.trim() ?? id;
```

### Pagination loop

```typescript
async function fetchSutartisList(buyerCode: string, supplierCode: string): Promise<ContractSummary[]> {
  const summaries: ContractSummary[] = [];
  for (let page = 1; ; page++) {
    const html = await fetchHtml(`/?page=${page}&perkanciosiosOrganizacijosKodas=${buyerCode}&tiekejoKodas=${supplierCode}`);
    const articles = parseArticles(html);
    if (articles.length === 0) break;
    summaries.push(...articles);
  }
  return summaries;
}
```

---

## Filter Compatibility

Year-range filters are applied to individual contract nodes:

- If `filters.yearFrom` is set: exclude contracts where `fromDate` year < `yearFrom`.
- If `filters.yearTo` is set: exclude contracts where `tillDate` year > `yearTo` (or `fromDate` if
  `tillDate` is null).
- Contracts with **null dates are always included** (unknown date ≠ out of range).
- Org stub nodes that become disconnected after contract filtering are removed from elements.

The default filter applied when no explicit filter is set:
- `yearFrom = currentYear - 1`
- `yearTo = currentYear`

---

## Out of Scope

- Fetching individual `/sutartis/{id}.json` blobs during graph expansion (lazy, on detail click).
- Recursive expansion of supplier/buyer orgs through their own contract pairs.
- Rate limiting / back-off (pairs are fetched sequentially within expandOrg; HTTP timeout is 15 s).
- Contracts between two non-anchor orgs (only direct anchor pairs are enriched).

---

## Tasks

**Phase 1 — Database & staging layer**

- [ ] Ensure project compiles and all existing tests pass (`npm test`)
- [ ] Add `StagingSutartisList` model to `prisma/schema.prisma` (see schema above)
- [ ] Run `npx prisma migrate dev --name add-staging-sutartis-list`
- [ ] Add `ContractSummary` type to `src/lib/viespirkiai/types.ts`
- [ ] Create `src/lib/staging/sutartisList.ts` with `getSutartisList` / `upsertSutartisList` (follow same pattern as `staging/sutartis.ts`; TTL 24 h via `STAGING_TTL_SUTARTIS_LIST_HOURS` env var)
- [ ] Add unit tests for staging helpers (mock `db`)
- [ ] Verify build and all tests pass
- [ ] Mark all checkboxes as done in this document once verified

**Phase 2 — HTML scraper**

- [ ] Add `fetchSutartisList(buyerCode, supplierCode): Promise<ContractSummary[]>` to
  `src/lib/viespirkiai/client.ts`:
  - Fetches HTML, parses `<article class="result-card …">` elements
  - Extracts `sutartiesUnikalusID`, `name`, `fromDate`, `tillDate`, `value`
  - Paginates (`page=1, 2, …`) until a page returns 0 articles
  - Returns deduplicated `ContractSummary[]`
- [ ] Add unit tests:
  - mock HTML with 2 articles → correct `ContractSummary[]` returned
  - single-date article → `fromDate` set, `tillDate` null
  - page 2 returns empty → loop stops, returns only page 1 results
  - HTTP error → returns empty array (non-throwing)
- [ ] Verify build and all tests pass
- [ ] Mark all checkboxes as done in this document once verified

**Phase 3 — Parser and expandOrg enrichment**

- [ ] Add `parseSutartisSummary(summaries: ContractSummary[], anchorId: string, partnerId: string, filters?: GraphFilters): CytoscapeElements` to `src/lib/parsers/sutartis.ts`:
  - One contract node per summary (type `'Contract'`)
  - Two edges per contract: buyer→contract (`label: 'Buyer'`) and contract→supplier (`label: 'Supplier'`)
  - Apply year/value filters (see Filter Compatibility section)
- [ ] In `src/lib/graph/expand.ts`, add `enrichContractEdges()` post-parse step:
  - Identify all `Contract`-type edges in elements
  - For each, derive buyer/supplier codes; skip if `!isResolvableJarKodas()`
  - Fetch `ContractSummary[]` from staging (cache) or `fetchSutartisList` (scrape)
  - Call `parseSutartisSummary` for each pair
  - Remove the original aggregated edge for any pair that produced ≥ 1 contract node
  - Add individual contract nodes/edges to elements
- [ ] Add unit tests:
  - `"replaces aggregated edge with individual contract nodes"` — mock summaries
  - `"keeps aggregated edge when scrape returns empty"` — mock empty list
  - `"applies yearFrom filter"` — filters out contract outside date range
  - `"skips unresolvable codes (0, 803)"`
- [ ] Verify build and all tests pass
- [ ] Mark all checkboxes as done in this document once verified

**Phase 4 — Default filter and table columns**

- [ ] In `src/components/graph/GraphView.tsx`, set initial filter state:
  `yearFrom = currentYear - 1`, `yearTo = currentYear`
- [ ] In `src/components/table/GraphDataTable.tsx`, add `fromDate` and `tillDate` columns to
  Contract rows (display as formatted date strings; empty cell when null)
- [ ] Verify UI compiles and graph opens with 1-year default window
- [ ] Mark all checkboxes as done in this document once verified

**Phase 5 — Cypress E2E tests & documentation**

- [ ] Add Cypress test in `cypress/e2e/graph-data-table.cy.ts`:
  - `"contract nodes have fromDate and tillDate in table"` — assert at least one Contract row has
    non-empty `fromDate` cell
  - `"default date filter shows only last-12-month contracts"` — verify table contains contracts
    from the expected year range on first load
- [ ] Update `docs/ARCHITECTURE.md`:
  - Add `StagingSutartisList` to the data-flow sequence diagram
  - Mention `fetchSutartisList` HTML scraper in the viespirkiai client section
- [ ] Run `npm run lint` — fix any issues
- [ ] Run `npm test` and `./bin/run-cypress-tests.sh` — all must pass
- [ ] Review implementation against this story
- [ ] Mark all checkboxes as done in this document once verified
