import {MultiDirectedGraph} from 'graphology';
import type {CytoscapeElements} from '@/types/graph';

export {MultiDirectedGraph};

/**
 * Converts CytoscapeElements (API response format) into a graphology MultiDirectedGraph.
 * If a graph instance is provided, nodes/edges are merged into it (idempotent).
 * All existing node x/y positions are preserved when merging.
 */
export function cytoscapeToGraphology(elements: CytoscapeElements, graph?: MultiDirectedGraph): MultiDirectedGraph {
    const g = graph ?? new MultiDirectedGraph();

    for (const node of elements.nodes) {
        const {id, ...rest} = node.data;
        g.mergeNode(id, rest);
    }

    for (const edge of elements.edges) {
        const {id, source, target, ...rest} = edge.data;
        if (!g.hasEdge(id)) {
            g.addEdgeWithKey(id, source, target, rest);
        }
    }

    return g;
}
