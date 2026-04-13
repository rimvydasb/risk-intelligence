## Future Use Cases

### UC-01: Bid Rigging / Cartel Detection

**Trigger:** Analyst investigates a tender category or a contracting authority.

**Detection logic:**

- Find all tenders where ≥3 of the same companies appear as participants.
- Identify rotational win patterns: companies A, B, C bid together repeatedly; each wins roughly 1/N of tenders.
- Identify spoiler bids: losing companies consistently submit bids 20–40% above the winner — suggesting they are
  providing cover quotes.

**Graph shape in Cytoscape.js:**

- Nodes: Companies (sized by total contract value won)
- Edges: Co-participation in the same tender (weighted by frequency)
- Layout: CoSE or force-directed — dense clusters of co-participants become visually obvious.
- Highlight: Edges where both nodes won alternately (rotational signal).

**Risk score contribution:** +60 per detected cluster member, +40 if win rotation is confirmed.

**Data needed:** CVP IS tender participants list (currently partially exposed via viespirkiai.org procurement data).

**Limitation:** Requires historical depth (≥3 years) to rule out coincidence. Tender participant lists are not always
complete in the current API — may require direct VPT data export.

---

### UC-02: Shell Company / Fronting Detection

**Trigger:** Contract value is disproportionate to company substance.

**Detection logic:**

- Compare contract `verte` (value) with SODRA `draustieji` (insured employees) and `imokuSuma` (monthly social
  contributions).
- Flag: `contract_value > 500,000 EUR` AND `employees < 5`.
- Flag: Company registration date within 6 months before contract signing date.
- Flag: Company has no prior contract history but wins a large direct negotiation (`tipas = "MVP"` or neskelbiamos
  derybos).

**Graph shape in Cytoscape.js:**

- Nodes: Company (color = risk level; size = contract value)
- Node label shows: employees, registration age, win method
- Edge to: Contracting authority, shareholders, linked entities via JADIS

**Risk score contribution:**

- `employees < 2`: +50
- `company age < 6 months at contract date`: +80
- `non-advertised negotiation`: +80
- `blacklisted supplier`: +100

**Data available:** All required fields are present in the current `/asmuo/{JAR}.json` endpoint (SODRA section + JAR
registration date + VPT contract type).

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

**Limitation:** VTEK declarations are self-reported and may be incomplete. System flags missing declarations as a risk
signal itself.

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

- > 80% value passed to single subcontractor: +70
- Circular shareholder structure: +90
- Subcontractor on blacklist: +100

**Data limitation:** Subcontractor relationships are only partially available via SABIS data in viespirkiai.org. This
use case may require direct CVP IS integration or manual enrichment.

---

### UC-05: EU Fund Double-Dipping Detection

**Trigger:** A company receives both a public procurement contract and EU fund project support for the same activity.

**Detection logic:**

- Cross-reference `cpvaProjektuSutartys` field in contract JSON with CPVA project data.
- Flag: Same company, same CPV code, overlapping date ranges, both funded.
- Flag: Company appears in both national VPT contracts and TED (EU-level) contracts simultaneously for the same
  deliverable.

**Risk score contribution:**

- Duplicate-funded activity detected: +80