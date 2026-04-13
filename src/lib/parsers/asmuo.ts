import type { AsmuoRaw } from '@/lib/viespirkiai/types';
import type { CytoscapeElements, CytoscapeNode, CytoscapeEdge } from '@/types/graph';
import type { FilterParams } from './types';

// Org type mapping from formosKodas
function orgType(formosKodas?: number): string {
  if (formosKodas === 320) return 'PublicCompany';
  if ([240, 340, 440, 490].includes(formosKodas ?? -1)) return 'Institution';
  return 'PrivateCompany';
}

function withinYear(
  fromDate: string | null | undefined,
  tillDate: string | null | undefined,
  year: number,
): boolean {
  const start = fromDate ? new Date(fromDate).getFullYear() : null;
  const end = tillDate ? new Date(tillDate).getFullYear() : null;
  if (start !== null && start > year) return false;
  if (end !== null && end < year) return false;
  return true;
}

export function parseAsmuo(raw: AsmuoRaw, filters?: FilterParams): CytoscapeElements {
  const nodes: CytoscapeNode[] = [];
  const edges: CytoscapeEdge[] = [];
  const seenNodes = new Set<string>();

  const addNode = (node: CytoscapeNode) => {
    if (!seenNodes.has(node.data.id)) {
      seenNodes.add(node.data.id);
      nodes.push(node);
    }
  };

  const jarKodas = String(raw.jar?.jarKodas ?? '');
  const anchorId = `org:${jarKodas}`;

  // ── Anchor organisation node ──────────────────────────────────────────
  addNode({
    data: {
      id: anchorId,
      label: raw.jar?.pavadinimas ?? jarKodas,
      type: orgType(raw.jar?.formosKodas),
      jarKodas,
      employees: raw.sodra?.draustieji ?? null,
      avgSalary: raw.sodra?.vidutinisAtlyginimas ?? null,
      expanded: true,
    },
  });

  // ── Employees (darbovietes) ───────────────────────────────────────────
  for (const d of raw.pinreg?.darbovietes ?? []) {
    if (filters?.year && !withinYear(d.nuo, d.iki, filters.year)) continue;
    const personId = `person:${d.deklaracija}`;
    const edgeId = `edge:${personId}:${anchorId}:Employment:${d.deklaracija}`;

    addNode({
      data: {
        id: personId,
        label: [d.vardas, d.pavarde].filter(Boolean).join(' ') || d.deklaracija,
        type: 'Person',
        deklaracija: d.deklaracija,
        fromDate: d.nuo ?? null,
        tillDate: d.iki ?? null,
      },
    });

    edges.push({
      data: {
        id: edgeId,
        source: personId,
        target: anchorId,
        type: 'Employment',
        label: d.pareigos ?? 'Employee',
        fromDate: d.nuo ?? null,
        tillDate: d.iki ?? null,
      },
    });
  }

  // ── Spouses (sutuoktinioDarbovietes) ─────────────────────────────────
  // `deklaracija` here is the declarant (employee) UUID, not the spouse.
  // Spouse has no UUID — synthesise from declarant UUID.
  for (const s of raw.pinreg?.sutuoktinioDarbovietes ?? []) {
    if (filters?.year && !withinYear(s.nuo, s.iki, filters.year)) continue;
    const declarantId = `person:${s.deklaracija}`;
    const spouseId = `person:spouse-${s.deklaracija}`;
    const edgeId = `edge:${declarantId}:${spouseId}:Spouse:${s.deklaracija}`;

    // Ensure declarant node exists (may have been added by darbovietes)
    addNode({
      data: {
        id: declarantId,
        label: s.deklaracija,
        type: 'Person',
        deklaracija: s.deklaracija,
        fromDate: null,
        tillDate: null,
      },
    });

    addNode({
      data: {
        id: spouseId,
        label: [s.vardas, s.pavarde].filter(Boolean).join(' ') || `Spouse of ${s.deklaracija}`,
        type: 'Person',
        deklaracija: null,
        synthesised: true,
        fromDate: s.nuo ?? null,
        tillDate: s.iki ?? null,
      },
    });

    edges.push({
      data: {
        id: edgeId,
        source: declarantId,
        target: spouseId,
        type: 'Spouse',
        label: 'Spouse',
        fromDate: s.nuo ?? null,
        tillDate: s.iki ?? null,
      },
    });
  }

  // ── Related persons (rysiaiSuJa) ──────────────────────────────────────
  for (const r of raw.pinreg?.rysiaiSuJa ?? []) {
    if (filters?.year && !withinYear(r.rysioPradzia, r.rysioPabaiga, filters.year)) continue;
    const personId = `person:${r.deklaracija}`;
    const edgeId = `edge:${personId}:${anchorId}:${r.rysioTipas ?? 'Official'}:${r.deklaracija}`;

    addNode({
      data: {
        id: personId,
        label: [r.vardas, r.pavarde].filter(Boolean).join(' ') || r.deklaracija,
        type: 'Person',
        deklaracija: r.deklaracija,
        fromDate: r.rysioPradzia ?? null,
        tillDate: r.rysioPabaiga ?? null,
      },
    });

    edges.push({
      data: {
        id: edgeId,
        source: personId,
        target: anchorId,
        type: r.rysioTipas ?? 'Official',
        label: r.rysioTipas ?? 'Official',
        fromDate: r.rysioPradzia ?? null,
        tillDate: r.rysioPabaiga ?? null,
      },
    });
  }

  // ── Contract relations — topPirkejai (buyers of anchorOrg) ───────────
  for (const buyer of raw.sutartys?.topPirkejai ?? []) {
    if (filters?.minContractValue && (buyer.verte ?? 0) < filters.minContractValue) continue;
    const buyerId = `org:${buyer.jarKodas}`;
    const edgeId = `edge:${buyerId}:${anchorId}:Contract`;

    addNode({
      data: {
        id: buyerId,
        label: buyer.pavadinimas ?? buyer.jarKodas,
        type: 'PrivateCompany',
        jarKodas: buyer.jarKodas,
        expanded: false,
      },
    });

    edges.push({
      data: {
        id: edgeId,
        source: buyerId,
        target: anchorId,
        type: 'Contract',
        label: 'Contract',
        totalValue: buyer.verte ?? null,
      },
    });
  }

  // ── Contract relations — topTiekejai (suppliers to anchorOrg) ────────
  for (const supplier of raw.sutartys?.topTiekejai ?? []) {
    if (filters?.minContractValue && (supplier.verte ?? 0) < filters.minContractValue) continue;
    const supplierId = `org:${supplier.jarKodas}`;
    const edgeId = `edge:${anchorId}:${supplierId}:Contract`;

    addNode({
      data: {
        id: supplierId,
        label: supplier.pavadinimas ?? supplier.jarKodas,
        type: 'PrivateCompany',
        jarKodas: supplier.jarKodas,
        expanded: false,
      },
    });

    edges.push({
      data: {
        id: edgeId,
        source: anchorId,
        target: supplierId,
        type: 'Contract',
        label: 'Contract',
        totalValue: supplier.verte ?? null,
      },
    });
  }

  return { nodes, edges };
}
