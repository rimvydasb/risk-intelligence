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

export interface Relationship {
  type: 'Contract' | 'Employment' | 'Spouse' | 'Official' | 'Shareholder' | 'Director';
  source: string;
  target: string;
  label?: string;
  fromDate?: string;
  tillDate?: string;
  data?: Record<string, unknown>;
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: string;
  [key: string]: unknown;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  [key: string]: unknown;
}

export interface CytoscapeNode {
  data: CytoscapeNodeData;
}

export interface CytoscapeEdge {
  data: CytoscapeEdgeData;
}

export interface CytoscapeElements {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export interface CytoscapeResponse {
  elements: CytoscapeElements;
  meta: {
    anchorId: string;
    totalNodes: number;
    totalEdges: number;
    generatedAt: string;
  };
}
