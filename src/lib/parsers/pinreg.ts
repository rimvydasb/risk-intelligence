import type {McpPinregRaw} from '@/lib/viespirkiai/types';
import {normalizeMcpApiResponse, type RawDeclaration} from '@/lib/viespirkiai/mcpClient';
import type {GraphElements, GraphNode, GraphEdge} from '@/types/graph';

// ── Relationship type mapping ─────────────────────────────────────────────

function edgeTypeFromPareigosType(pareiguTipasPavadinimas: string | undefined): string {
    if (!pareiguTipasPavadinimas) return 'Official';
    const t = pareiguTipasPavadinimas.toLowerCase();
    if (t.includes('vadovas') || t.includes('pavaduotojas')) return 'Director';
    if (t.includes('darbuotojas')) return 'Employment';
    return 'Official';
}

function edgeTypeFromRysys(rysioPobudzioPavadinimas: string | undefined): string {
    if (!rysioPobudzioPavadinimas) return 'Official';
    const t = rysioPobudzioPavadinimas.toLowerCase();
    if (t.includes('valdybos narys') || t.includes('stebėtojų tarybos narys') || t.includes('komiteto narys')) {
        return 'Director';
    }
    if (t.includes('akcininkas')) return 'Shareholder';
    return 'Official';
}

/**
 * Parse MCP pinreg data for a known person into graph elements.
 *
 * Produces:
 * - Stub OrganizationEntity nodes (expanded=false) for each workplace / governance tie
 * - Typed edges from personId → each org (Employment / Director / Official / Shareholder)
 * - Spouse PersonEntity stub + Spouse edge + org Employment edge (from sutuoktinioDarbovietes)
 *
 * Org nodes are deduplicated by jarKodas. Multiple entries for the same org
 * (e.g. different darbovietesTipas) produce only one org node but separate edges.
 */
export function parsePinreg(raw: McpPinregRaw, personId: string): GraphElements {
    // Legacy cached data may be the raw API array format — normalize it first.
    const normalized: McpPinregRaw = Array.isArray(raw)
        ? normalizeMcpApiResponse(raw as unknown as RawDeclaration[])
        : raw;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenNodes = new Set<string>();

    const addNode = (node: GraphNode) => {
        if (!seenNodes.has(node.data.id)) {
            seenNodes.add(node.data.id);
            nodes.push(node);
        }
    };

    const addOrgStub = (jarKodas: string, pavadinimas: string | undefined) => {
        addNode({
            data: {
                id: `org:${jarKodas}`,
                label: pavadinimas ?? jarKodas,
                type: 'PrivateCompany',
                category: 'company',
                jarKodas,
                expanded: false,
            },
        });
    };

    // ── darbovietes (workplaces) ──────────────────────────────────────────
    for (const d of normalized.darbovietes ?? []) {
        if (!d.jarKodas) continue;
        addOrgStub(d.jarKodas, d.pavadinimas);

        const orgId = `org:${d.jarKodas}`;
        const edgeType = edgeTypeFromPareigosType(d.pareiguTipasPavadinimas);
        const edgeId = `edge:${personId}:${orgId}:${edgeType}:pinreg:${d.deklaracija}:${d.darbovietesTipas ?? ''}`;

        edges.push({
            data: {
                id: edgeId,
                source: personId,
                target: orgId,
                type: edgeType,
                label: d.pareigos ?? d.pareiguTipasPavadinimas ?? edgeType,
                fromDate: d.rysioPradzia ?? null,
                tillDate: null,
            },
        });
    }

    // ── rysiaiSuJa (governance ties) ──────────────────────────────────────
    for (const r of normalized.rysiaiSuJa ?? []) {
        if (!r.jarKodas) continue;
        addOrgStub(r.jarKodas, r.pavadinimas);

        const orgId = `org:${r.jarKodas}`;
        const edgeType = edgeTypeFromRysys(r.rysioPobudzioPavadinimas);
        const edgeId = `edge:${personId}:${orgId}:${edgeType}:pinreg:${r.deklaracija}:${r.rysioPradzia ?? ''}`;

        edges.push({
            data: {
                id: edgeId,
                source: personId,
                target: orgId,
                type: edgeType,
                label: r.rysioPobudzioPavadinimas ?? edgeType,
                fromDate: r.rysioPradzia ?? null,
                tillDate: r.rysioPabaiga ?? null,
            },
        });
    }

    // ── sutuoktinioDarbovietes (spouse's workplaces) ───────────────────────
    for (const s of normalized.sutuoktinioDarbovietes ?? []) {
        if (!s.jarKodas) continue;

        // Spouse node: use deklaracija-based ID to avoid collision with declarant
        const spouseId = `person:spouse:${s.deklaracija}`;
        const spouseName =
            [s.sutuoktinioVardas, s.sutuoktinioPavarde].filter(Boolean).join(' ') ||
            `Spouse of ${[s.vardas, s.pavarde].filter(Boolean).join(' ') || s.deklaracija}`;

        addNode({
            data: {
                id: spouseId,
                label: spouseName,
                type: 'Person',
                category: 'person',
                deklaracija: null,
                synthesised: true,
                fromDate: s.rysioPradzia ?? null,
                tillDate: s.rysioPabaiga ?? null,
            },
        });

        // Spouse edge: declarant → spouse
        const spouseEdgeId = `edge:${personId}:${spouseId}:Spouse:pinreg:${s.deklaracija}`;
        edges.push({
            data: {
                id: spouseEdgeId,
                source: personId,
                target: spouseId,
                type: 'Spouse',
                label: 'Spouse',
                fromDate: null,
                tillDate: null,
            },
        });

        // Spouse's employer org stub
        addOrgStub(s.jarKodas, s.pavadinimas);

        // Employment edge: spouse → org
        const orgId = `org:${s.jarKodas}`;
        const empEdgeId = `edge:${spouseId}:${orgId}:Employment:pinreg:${s.deklaracija}`;
        edges.push({
            data: {
                id: empEdgeId,
                source: spouseId,
                target: orgId,
                type: 'Employment',
                label: s.pareiguTipasPavadinimas ?? 'Employee',
                fromDate: s.rysioPradzia ?? null,
                tillDate: s.rysioPabaiga ?? null,
            },
        });
    }

    return {nodes, edges};
}
