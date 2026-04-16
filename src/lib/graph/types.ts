import type {GraphElements} from '@/types/graph';
import type {FilterParams} from '@/lib/parsers/types';

export interface GraphFilters extends FilterParams {}

export interface ExpandResult {
    elements: GraphElements;
    meta: {
        anchorId: string;
        totalNodes: number;
        totalEdges: number;
        generatedAt: string;
        cached: boolean;
    };
}

export interface EntityDetailResult {
    id: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
}
