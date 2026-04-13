import type cytoscape from 'cytoscape';

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

export interface FcoseLayoutOptions extends cytoscape.BaseLayoutOptions {
  name: 'fcose';
  quality?: 'draft' | 'default' | 'proof';
  randomize?: boolean;
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  fit?: boolean;
  padding?: number;
  nodeDimensionsIncludeLabels?: boolean;
  uniformNodeDimensions?: boolean;
  packComponents?: boolean;
  nodeRepulsion?: (node: cytoscape.NodeSingular) => number;
  idealEdgeLength?: (edge: cytoscape.EdgeSingular) => number;
  edgeElasticity?: (edge: cytoscape.EdgeSingular) => number;
  nestingFactor?: number;
  gravity?: number;
  gravityRangeCompound?: number;
  gravityCompound?: number;
  gravityRange?: number;
  initialEnergyOnIncremental?: number;
  incremental?: boolean;
  numIter?: number;
  tile?: boolean;
  tilingPaddingVertical?: number;
  tilingPaddingHorizontal?: number;
  [key: string]: unknown;
}
