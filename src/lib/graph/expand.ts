import {getAsmuo, upsertAsmuo} from '@/lib/staging/asmuo';
import {getSutartisContracts, upsertSutartisContracts} from '@/lib/staging/sutartis';
import {fetchAsmuo, fetchSutartisList} from '@/lib/viespirkiai/client';
import {parseAsmuo} from '@/lib/parsers/asmuo';
import {parseSutartisSummary} from '@/lib/parsers/sutartis';
import type {GraphElements, GraphNode} from '@/types/graph';
import type {GraphFilters, ExpandResult} from './types';

const NEZINOMAS_LABELS = new Set(['Nežinomas', 'Nezinomas']);

/** A jarKodas is resolvable when it looks like a real Lithuanian company code (≥ 6 digits). */
export function isResolvableJarKodas(jarKodas: string): boolean {
    const n = parseInt(jarKodas, 10);
    return !isNaN(n) && n >= 100_000;
}

/** Fetch the real name for a stub org node that has "Nežinomas" as its label. */
async function enrichStubNode(node: GraphNode): Promise<void> {
    const jarKodas = node.data.jarKodas as string | undefined;
    if (!jarKodas || !isResolvableJarKodas(jarKodas)) return;

    let entry = await getAsmuo(jarKodas);
    if (!entry) {
        const raw = await fetchAsmuo(jarKodas);
        await upsertAsmuo(jarKodas, raw);
        entry = {data: raw, fetchedAt: new Date()};
    }

    const realName = entry.data.jar?.pavadinimas;
    if (realName) {
        node.data.label = realName;
    }
}

/**
 * Replace aggregated Contract edges with individual contract nodes+edges scraped from
 * viespirkiai.org HTML contract list pages. Sequentially fetches each anchor↔partner pair.
 * Org nodes that become disconnected after all contracts are replaced (e.g. filtered out) are
 * removed.
 */
async function enrichContractEdges(
    elements: GraphElements,
    anchorId: string,
    filters: GraphFilters | undefined,
): Promise<void> {
    const contractEdges = elements.edges.filter((e) => e.data.type === 'Contract');
    if (contractEdges.length === 0) return;

    const anchorJarKodas = anchorId.replace('org:', '');

    // Remove aggregated Contract edges — replaced by individual contract nodes+edges
    elements.edges = elements.edges.filter((e) => e.data.type !== 'Contract');

    for (const edge of contractEdges) {
        const isAnchorBuyer = edge.data.source === anchorId;
        const partnerId = String(isAnchorBuyer ? edge.data.target : edge.data.source);
        const partnerJarKodas = partnerId.replace('org:', '');

        const buyerCode = isAnchorBuyer ? anchorJarKodas : partnerJarKodas;
        const supplierCode = isAnchorBuyer ? partnerJarKodas : anchorJarKodas;

        let entry = await getSutartisContracts(buyerCode, supplierCode);
        if (!entry) {
            const contracts = await fetchSutartisList(buyerCode, supplierCode);
            await upsertSutartisContracts(contracts, buyerCode, supplierCode);
            entry = contracts;
        }

        const {nodes, edges} = parseSutartisSummary(entry, anchorId, partnerId, isAnchorBuyer, filters);
        elements.nodes.push(...nodes);
        elements.edges.push(...edges);
    }
}

export async function expandOrg(jarKodas: string, filters?: GraphFilters): Promise<ExpandResult> {
    const anchorId = `org:${jarKodas}`;

    let cached = true;
    let entry = await getAsmuo(jarKodas);

    if (!entry) {
        cached = false;
        const raw = await fetchAsmuo(jarKodas);
        await upsertAsmuo(jarKodas, raw);
        entry = {data: raw, fetchedAt: new Date()};
    }

    const elements = parseAsmuo(entry.data, filters);

    // Enrich stub org nodes whose name the API returned as "Nežinomas".
    const stubsToEnrich = elements.nodes.filter(
        (n) => n.data.expanded === false && NEZINOMAS_LABELS.has(n.data.label as string),
    );
    await Promise.all(stubsToEnrich.map(enrichStubNode));

    // Replace aggregated Contract edges with individual dated contract nodes+edges.
    await enrichContractEdges(elements, anchorId, filters);

    return {
        elements,
        meta: {
            anchorId,
            totalNodes: elements.nodes.length,
            totalEdges: elements.edges.length,
            generatedAt: new Date().toISOString(),
            cached,
        },
    };
}
