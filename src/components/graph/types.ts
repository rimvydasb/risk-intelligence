import type {GraphNodeData} from '@/types/graph';

export interface FilterState {
    yearFrom?: string;
    yearTo?: string;
    minContractValue?: number;
}

export interface GraphState {
    selectedNodeId: string | null;
    selectedNodeData: GraphNodeData | null;
    filters: FilterState;
    pendingExpand: string | null;
}
