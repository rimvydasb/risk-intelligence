import { cytoscapeToGraphology, MultiDirectedGraph } from '../adapter';
import type { CytoscapeElements } from '@/types/graph';

const ELEMENTS: CytoscapeElements = {
  nodes: [
    { data: { id: 'org:111', label: 'Acme', type: 'PublicCompany', expanded: true } },
    { data: { id: 'org:222', label: 'Beta', type: 'PrivateCompany', expanded: false } },
    { data: { id: 'person:abc', label: 'John', type: 'Person', expanded: true } },
  ],
  edges: [
    { data: { id: 'e1', source: 'org:111', target: 'org:222', type: 'Contract', label: 'Contract' } },
    { data: { id: 'e2', source: 'person:abc', target: 'org:111', type: 'Director', label: 'Director' } },
  ],
};

describe('cytoscapeToGraphology', () => {
  it('creates a MultiDirectedGraph with correct node count', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    expect(graph).toBeInstanceOf(MultiDirectedGraph);
    expect(graph.order).toBe(3);
  });

  it('creates correct edge count', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    expect(graph.size).toBe(2);
  });

  it('preserves node attributes', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    const attrs = graph.getNodeAttributes('org:111');
    expect(attrs.label).toBe('Acme');
    expect(attrs.type).toBe('PublicCompany');
    expect(attrs.expanded).toBe(true);
  });

  it('preserves edge attributes', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    const attrs = graph.getEdgeAttributes('e1');
    expect(attrs.type).toBe('Contract');
    expect(attrs.label).toBe('Contract');
  });

  it('preserves edge source and target', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    expect(graph.source('e1')).toBe('org:111');
    expect(graph.target('e1')).toBe('org:222');
  });

  it('is idempotent — calling twice does not duplicate nodes or edges', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    cytoscapeToGraphology(ELEMENTS, graph);
    expect(graph.order).toBe(3);
    expect(graph.size).toBe(2);
  });

  it('merges new nodes into an existing graph without touching existing ones', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    graph.setNodeAttribute('org:111', 'x', 100);
    graph.setNodeAttribute('org:111', 'y', 200);

    const extra: CytoscapeElements = {
      nodes: [{ data: { id: 'org:333', label: 'Gamma', type: 'PrivateCompany', expanded: false } }],
      edges: [],
    };
    cytoscapeToGraphology(extra, graph);

    expect(graph.order).toBe(4);
    // Existing node position is preserved after merge
    expect(graph.getNodeAttribute('org:111', 'x')).toBe(100);
    expect(graph.getNodeAttribute('org:111', 'y')).toBe(200);
  });

  it('does not add duplicate edges', () => {
    const graph = cytoscapeToGraphology(ELEMENTS);
    cytoscapeToGraphology(
      { nodes: [], edges: [ELEMENTS.edges[0]] },
      graph,
    );
    expect(graph.size).toBe(2);
  });

  it('returns a directed multi-graph (allows multiple edges between same nodes)', () => {
    const graph = cytoscapeToGraphology({
      nodes: [
        { data: { id: 'a', label: 'A', type: 'PrivateCompany' } },
        { data: { id: 'b', label: 'B', type: 'PrivateCompany' } },
      ],
      edges: [
        { data: { id: 'e-a-b-1', source: 'a', target: 'b', type: 'Contract' } },
        { data: { id: 'e-a-b-2', source: 'a', target: 'b', type: 'Contract' } },
      ],
    });
    expect(graph.size).toBe(2);
    expect(graph.multi).toBe(true);
    expect(graph.type).toBe('directed');
  });
});
