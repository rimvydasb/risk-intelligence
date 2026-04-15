import type {CytoscapeNodeData} from '@/types/graph';

export interface FilterState {
    yearFrom?: string;
    yearTo?: string;
    minContractValue?: number;
}

export interface GraphState {
    selectedNodeId: string | null;
    selectedNodeData: CytoscapeNodeData | null;
    filters: FilterState;
    pendingExpand: string | null;
}
