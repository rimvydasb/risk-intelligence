import type {SutartisRaw} from '@/lib/viespirkiai/types';
import type {CytoscapeElements, CytoscapeNode, CytoscapeEdge} from '@/types/graph';

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
