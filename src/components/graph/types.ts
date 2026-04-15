import type {CytoscapeNodeData} from '@/types/graph';

export interface FilterState {
    year?: number;
    yearTo?: number;
    minContractValue?: number;
}

export interface GraphState {
    selectedNodeId: string | null;
    selectedNodeData: CytoscapeNodeData | null;
    filters: FilterState;
    pendingExpand: string | null;
}
