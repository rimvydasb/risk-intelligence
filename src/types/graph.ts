export interface TemporalEntity {
    id: string;
    name: string;
    fromDate: string | null;
    tillDate: string | null;
}

export interface OrganizationEntity extends TemporalEntity {
    type: 'PrivateCompany' | 'PublicCompany' | 'Institution';
    expanded: boolean;
}

export interface PersonEntity extends TemporalEntity {
    data: Record<string, unknown>;
}

export interface TenderEntity extends TemporalEntity {
    estimatedValue?: number | null;
}

/**
 * ContractEntity represents a public procurement contract as a graph node (hub-and-spoke model).
 * id       - "contract:" + sutartiesUnikalusID
 * name     - pavadinimas
 * fromDate - earliest date among all known date fields (sudarymoData / paskelbimoData / galiojimoData)
 * tillDate - latest date among all known date fields; null when only one date is available
 * value    - contract value in EUR (verte)
 */
export interface ContractEntity extends TemporalEntity {
    contractId: string;   // raw sutartiesUnikalusID
    value: number | null; // contract value in EUR
}

export interface Relationship {
    // 'Contract' is reserved for future use when contracts are painted as edges instead of nodes.
    type: 'Contract' | 'Employment' | 'Spouse' | 'Official' | 'Shareholder' | 'Director';
    source: string;
    target: string;
    label?: string;
    fromDate?: string;
    tillDate?: string;
    data?: Record<string, unknown>;
}

export interface GraphNodeData {
    id: string;
    label: string;
    type: string;
    [key: string]: unknown;
}

export interface GraphEdgeData {
    id: string;
    source: string;
    target: string;
    type: string;
    label?: string;
    [key: string]: unknown;
}

export interface GraphNode {
    data: GraphNodeData;
}

export interface GraphEdge {
    data: GraphEdgeData;
}

export interface GraphElements {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GraphResponse {
    elements: GraphElements;
    meta: {
        anchorId: string;
        totalNodes: number;
        totalEdges: number;
        generatedAt: string;
    };
}
