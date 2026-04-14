'use client';

import React, { useEffect, useRef } from 'react';
import type { CytoscapeElements, CytoscapeNodeData } from '@/types/graph';

// Sigma + Graphology are browser-only (WebGL) — imported at runtime via dynamic() in GraphView
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SigmaLib = typeof window !== 'undefined' ? require('sigma') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SigmaRendering = typeof window !== 'undefined' ? require('sigma/rendering') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fa2 = typeof window !== 'undefined' ? require('graphology-layout-forceatlas2') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FA2Worker = typeof window !== 'undefined' ? require('graphology-layout-forceatlas2/worker') : null;

import type { MultiDirectedGraph } from './adapter';

// ── Node size / color by type ─────────────────────────────────────────────
const NODE_TYPE_CONFIG: Record<string, { color: string; size: number }> = {
  PublicCompany:  { color: '#1976d2', size: 22 },
  PrivateCompany: { color: '#388e3c', size: 12 },
  Institution:    { color: '#7b1fa2', size: 26 },
  Person:         { color: '#f57c00', size: 14 },
  Tender:         { color: '#0097a7', size: 18 },
};

const DEFAULT_NODE = { color: '#546e7a', size: 10 };

// ── Edge color by type ────────────────────────────────────────────────────
const EDGE_TYPE_CONFIG: Record<string, { color: string; size: number }> = {
  Contract:    { color: '#64b5f6', size: 1.5 },
  Employment:  { color: '#78909c', size: 1.0 },
  Official:    { color: '#78909c', size: 1.0 },
  Director:    { color: '#ff1667', size: 1.2 },
  Shareholder: { color: '#ff1667', size: 1.2 },
  Spouse:      { color: '#ffcc02', size: 1.0 },
};

const DEFAULT_EDGE = { color: '#546e7a', size: 0.8 };

interface XY { x: number; y: number }

// Place new nodes near their connected anchor nodes so FA2 has a good starting point.
// Without sensible initial positions FA2 may take longer to converge.
function placeNewNodesNearAnchors(
  newNodes: CytoscapeElements['nodes'],
  edges: CytoscapeElements['edges'],
  existingPositions: Map<string, XY>,
): Map<string, XY> {
  const positions = new Map<string, XY>();

  // Compute graph centroid as fallback
  let cx = 0, cy = 0;
  if (existingPositions.size > 0) {
    for (const pos of existingPositions.values()) { cx += pos.x; cy += pos.y; }
    cx /= existingPositions.size;
    cy /= existingPositions.size;
  }

  // Track how many nodes have been placed around each anchor (for ring distribution)
  const anchorChildCount = new Map<string, number>();

  for (const node of newNodes) {
    const id = node.data.id;

    // Find a connected existing node to use as anchor
    const connectedEdge = edges.find(e =>
      (e.data.source === id && existingPositions.has(e.data.target)) ||
      (e.data.target === id && existingPositions.has(e.data.source)),
    );

    let anchor: XY;
    let anchorKey: string;
    if (connectedEdge) {
      anchorKey = existingPositions.has(connectedEdge.data.target)
        ? connectedEdge.data.target
        : connectedEdge.data.source;
      anchor = existingPositions.get(anchorKey)!;
    } else {
      anchorKey = '__centroid__';
      anchor = { x: cx, y: cy };
    }

    const idx = anchorChildCount.get(anchorKey) ?? 0;
    anchorChildCount.set(anchorKey, idx + 1);

    // Distribute evenly in a ring around the anchor
    const baseRadius = 200;
    const angle = (idx / Math.max(1, newNodes.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    positions.set(id, {
      x: anchor.x + baseRadius * Math.cos(angle) + (Math.random() - 0.5) * 30,
      y: anchor.y + baseRadius * Math.sin(angle) + (Math.random() - 0.5) * 30,
    });
  }

  return positions;
}

export interface SigmaCanvasProps {
  elements: CytoscapeElements;
  onNodeClick: (nodeId: string, nodeData: CytoscapeNodeData) => void;
  onBackgroundClick: () => void;
  cyRef?: React.MutableRefObject<unknown>;
  balanceTrigger?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SigmaInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FA2WorkerInstance = any;

// How long (ms) the FA2 worker runs after each expansion vs. manual Balance
const AUTO_LAYOUT_DURATION_MS = 2000;
const BALANCE_LAYOUT_DURATION_MS = 5000;

export default function SigmaCanvas({
  elements,
  onNodeClick,
  onBackgroundClick,
  cyRef,
  balanceTrigger,
}: SigmaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<SigmaInstance | null>(null);
  const graphRef = useRef<MultiDirectedGraph | null>(null);
  const selectedNodeRef = useRef<string | null>(null);
  const balanceWorkerRef = useRef<FA2WorkerInstance | null>(null);
  const autoLayoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getExistingPositions(): Map<string, XY> {
    const graph = graphRef.current;
    if (!graph) return new Map();
    const map = new Map<string, XY>();
    graph.forEachNode((id, attrs) => {
      if (typeof attrs.x === 'number' && typeof attrs.y === 'number') {
        map.set(id, { x: attrs.x, y: attrs.y });
      }
    });
    return map;
  }

  function buildNodeReducer(selected: string | null) {
    return (node: string, data: Record<string, unknown>) => {
      const cfg = NODE_TYPE_CONFIG[data.type as string] ?? DEFAULT_NODE;
      const isExpanded = data.expanded !== false;
      return {
        x: data.x as number,
        y: data.y as number,
        label: (data.label as string | null) ?? node,
        color: isExpanded ? cfg.color : adjustOpacity(cfg.color, 0.5),
        size: cfg.size,
        highlighted: node === selected,
      };
    };
  }

  function buildEdgeReducer() {
    return (_edge: string, data: Record<string, unknown>) => {
      const cfg = EDGE_TYPE_CONFIG[data.type as string] ?? DEFAULT_EDGE;
      return {
        color: cfg.color,
        size: cfg.size,
        label: (data.label as string | null) ?? null,
      };
    };
  }

  // Start FA2 worker, stop after durationMs, then fit camera.
  // Any in-progress layout is stopped first so expansions don't compound.
  function startFA2Worker(durationMs: number) {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph || !FA2Worker || graph.order === 0) return;

    // Cancel any pending auto-layout timer
    if (autoLayoutTimerRef.current !== null) {
      clearTimeout(autoLayoutTimerRef.current);
      autoLayoutTimerRef.current = null;
    }
    // Stop any running worker
    balanceWorkerRef.current?.stop();

    const FA2Supervisor = FA2Worker.default ?? FA2Worker;
    const supervisor = new FA2Supervisor(graph, {
      settings: { gravity: 1, scalingRatio: 8, slowDown: 15 },
    });
    balanceWorkerRef.current = supervisor;
    supervisor.start();

    autoLayoutTimerRef.current = setTimeout(() => {
      supervisor.stop();
      autoLayoutTimerRef.current = null;
      sigma.refresh();
      sigma.getCamera().animatedReset();
    }, durationMs);
  }

  // Mount Sigma once
  useEffect(() => {
    if (!containerRef.current || !SigmaLib || !SigmaRendering) return;

    const Sigma = SigmaLib.default ?? SigmaLib.Sigma ?? SigmaLib;
    const { EdgeArrowProgram } = SigmaRendering;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const graph: MultiDirectedGraph = new (require('graphology').MultiDirectedGraph)();
    graphRef.current = graph;

    const sigma: SigmaInstance = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      renderEdgeLabels: false,
      defaultEdgeType: 'arrow',
      labelFont: 'Arial, Roboto, sans-serif',
      labelSize: 10,
      labelColor: { color: '#e0e0e0' },
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 6,
      stagePadding: 30,
      edgeProgramClasses: { arrow: EdgeArrowProgram },
      nodeReducer: buildNodeReducer(selectedNodeRef.current),
      edgeReducer: buildEdgeReducer(),
      zIndex: true,
    });

    sigma.on('clickNode', (payload: { node: string }) => {
      selectedNodeRef.current = payload.node;
      sigma.setSettings({ nodeReducer: buildNodeReducer(payload.node) });
      const attrs = graph.getNodeAttributes(payload.node);
      onNodeClick(payload.node, { id: payload.node, ...attrs } as CytoscapeNodeData);
    });

    sigma.on('clickStage', () => {
      selectedNodeRef.current = null;
      sigma.setSettings({ nodeReducer: buildNodeReducer(null) });
      onBackgroundClick();
    });

    sigmaRef.current = sigma;
    if (cyRef) cyRef.current = sigma;

    return () => {
      if (autoLayoutTimerRef.current !== null) clearTimeout(autoLayoutTimerRef.current);
      balanceWorkerRef.current?.stop();
      balanceWorkerRef.current = null;
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge elements and re-run FA2 to prevent overlap.
  // Strategy:
  //   - New nodes placed near their connected anchor (ring distribution) so FA2 converges fast.
  //   - Existing node positions are preserved as FA2 starting point.
  //   - FA2 worker runs for AUTO_LAYOUT_DURATION_MS then stops — animated, non-blocking.
  useEffect(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph || !elements) return;

    const newNodes = elements.nodes.filter(n => !graph.hasNode(n.data.id));
    const newEdges = elements.edges.filter(e => !graph.hasEdge(e.data.id));
    if (newNodes.length === 0 && newEdges.length === 0) return;

    const existingPositions = getExistingPositions();
    const isFirstLoad = existingPositions.size === 0;

    if (isFirstLoad) {
      // Scatter nodes randomly so FA2 has something to work with
      for (const node of newNodes) {
        const { id, ...attrs } = node.data;
        graph.mergeNode(id, {
          ...attrs,
          x: (Math.random() - 0.5) * 1000,
          y: (Math.random() - 0.5) * 1000,
        });
      }
    } else {
      // Place new nodes near their connected anchors (gives FA2 a sensible start)
      const prePositions = placeNewNodesNearAnchors(newNodes, elements.edges, existingPositions);
      for (const node of newNodes) {
        const { id, ...attrs } = node.data;
        const pos = prePositions.get(id) ?? { x: (Math.random() - 0.5) * 500, y: (Math.random() - 0.5) * 500 };
        graph.mergeNode(id, { ...attrs, x: pos.x, y: pos.y });
      }
    }

    for (const edge of newEdges) {
      const { id, source, target, ...attrs } = edge.data;
      if (!graph.hasEdge(id)) graph.addEdgeWithKey(id, source, target, attrs);
    }

    if (isFirstLoad && fa2 && graph.order > 0) {
      // Synchronous warm-up pass so initial render is already reasonable
      const fa2fn = fa2.default ?? fa2;
      fa2fn(graph, { iterations: 200, settings: { gravity: 1, scalingRatio: 8, slowDown: 10 } });
      sigma.refresh();
    }

    // Always animate-layout after any change: FA2 worker runs for AUTO_LAYOUT_DURATION_MS
    startFA2Worker(AUTO_LAYOUT_DURATION_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  // Manual "Balance" button — longer FA2 run for a thorough re-layout
  useEffect(() => {
    if (!balanceTrigger || balanceTrigger === 0) return;
    startFA2Worker(BALANCE_LAYOUT_DURATION_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceTrigger]);

  return (
    <div
      ref={containerRef}
      data-testid="graph-container"
      style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
    />
  );
}

function adjustOpacity(hex: string, opacity: number): string {
  // Parse #rrggbb and blend with dark background (#0a0a0a = 10,10,10)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = 10;
  const nr = Math.round(r * opacity + bg * (1 - opacity));
  const ng = Math.round(g * opacity + bg * (1 - opacity));
  const nb = Math.round(b * opacity + bg * (1 - opacity));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
