import type {SutartisRaw} from '@/lib/viespirkiai/types';
import type {CytoscapeElements, CytoscapeNode, CytoscapeEdge} from '@/types/graph';
import type {ContractSummary, FilterParams} from './types';

/** Returns the earliest and latest ISO date strings from among all known date fields. */
function contractDateRange(raw: SutartisRaw): {fromDate: string | null; tillDate: string | null} {
    const candidates = [raw.sudarymoData, raw.paskelbimoData, raw.galiojimoData, raw.faktineIvykdimoData].filter(
        (d): d is string => typeof d === 'string' && d.length > 0,
    );

    if (candidates.length === 0) return {fromDate: null, tillDate: null};

    const sorted = candidates.slice().sort();
    return {fromDate: sorted[0], tillDate: sorted[sorted.length - 1]};
}

export function parseSutartis(raw: SutartisRaw): CytoscapeElements {
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];

    const contractId = `contract:${raw.sutartiesUnikalusID}`;
    const buyerCode = raw.perkanciosiosOrganizacijosKodas;
    const supplierCode = raw.tiekejoKodas;

    if (buyerCode) {
        nodes.push({
            data: {
                id: `org:${buyerCode}`,
                label: raw.perkanciojiOrganizacija ?? buyerCode,
                type: 'PrivateCompany',
                jarKodas: buyerCode,
                expanded: false,
            },
        });
    }

    if (supplierCode) {
        nodes.push({
            data: {
                id: `org:${supplierCode}`,
                label: raw.tiekejas ?? supplierCode,
                type: 'PrivateCompany',
                jarKodas: supplierCode,
                expanded: false,
            },
        });
    }

    const {fromDate, tillDate} = contractDateRange(raw);

    nodes.push({
        data: {
            id: contractId,
            label: raw.pavadinimas ?? raw.sutartiesUnikalusID,
            type: 'Contract',
            contractId: raw.sutartiesUnikalusID,
            value: raw.verte ?? null,
            fromDate,
            tillDate,
        },
    });

    if (buyerCode) {
        edges.push({
            data: {
                id: `edge:org:${buyerCode}:${contractId}:Signed`,
                source: `org:${buyerCode}`,
                target: contractId,
                type: 'Signed',
                label: 'Buyer',
                value: raw.verte ?? null,
            },
        });
    }

    if (supplierCode) {
        edges.push({
            data: {
                id: `edge:org:${supplierCode}:${contractId}:Signed`,
                source: `org:${supplierCode}`,
                target: contractId,
                type: 'Signed',
                label: 'Supplier',
                value: raw.verte ?? null,
            },
        });
    }

    return {nodes, edges};
}

/**
 * Convert a list of scraped ContractSummary objects into Cytoscape nodes+edges.
 *
 * Each contract becomes:
 *   - A Contract node
 *   - An edge from buyer → contract (Signed/Buyer)
 *   - An edge from supplier → contract (Signed/Supplier)
 *
 * Contracts outside the filter date range are excluded.
 * If either buyer or supplier org node doesn't yet exist in the graph it will be created as a stub.
 *
 * @param summaries   - Scraped contract list
 * @param anchorId    - The org that was expanded (e.g. "org:110053842")
 * @param partnerId   - The counterparty org (e.g. "org:304971164")
 * @param isAnchorBuyer - true  → anchor is perkanciojiOrganizacija, partner is tiekėjas
 *                        false → partner is buyer, anchor is supplier
 * @param filters     - Date/value filter params
 */
export function parseSutartisSummary(
    summaries: ContractSummary[],
    anchorId: string,
    partnerId: string,
    isAnchorBuyer: boolean,
    filters?: FilterParams,
): CytoscapeElements {
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];

    const buyerId = isAnchorBuyer ? anchorId : partnerId;
    const supplierId = isAnchorBuyer ? partnerId : anchorId;

    for (const s of summaries) {
        // Date range filter (lexicographic ISO comparison)
        if (filters?.yearFrom && s.tillDate && s.tillDate < filters.yearFrom) continue;
        if (filters?.yearTo && s.fromDate && s.fromDate > filters.yearTo) continue;

        // Value filter
        if (filters?.minContractValue !== undefined && s.value !== null && s.value < filters.minContractValue) continue;

        const contractId = `contract:${s.sutartiesUnikalusID}`;

        nodes.push({
            data: {
                id: contractId,
                label: s.name || s.sutartiesUnikalusID,
                type: 'Contract',
                contractId: s.sutartiesUnikalusID,
                value: s.value,
                fromDate: s.fromDate,
                tillDate: s.tillDate,
            },
        });

        edges.push({
            data: {
                id: `edge:${buyerId}:${contractId}:Signed`,
                source: buyerId,
                target: contractId,
                type: 'Signed',
                label: 'Buyer',
                value: s.value,
            },
        });

        edges.push({
            data: {
                id: `edge:${supplierId}:${contractId}:Signed`,
                source: supplierId,
                target: contractId,
                type: 'Signed',
                label: 'Supplier',
                value: s.value,
            },
        });
    }

    return {nodes, edges};
}
