'use client';

import React, {useEffect, useRef} from 'react';
import type {CytoscapeElements, CytoscapeNodeData} from '@/types/graph';
import type {MultiDirectedGraph} from './adapter';

// Sigma + Graphology are browser-only (WebGL) — imported at runtime via dynamic() in GraphView
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SigmaLib = typeof window !== 'undefined' ? require('sigma') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SigmaRendering = typeof window !== 'undefined' ? require('sigma/rendering') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeImageLib = typeof window !== 'undefined' ? require('@sigma/node-image') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fa2 = typeof window !== 'undefined' ? require('graphology-layout-forceatlas2') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FA2Worker = typeof window !== 'undefined' ? require('graphology-layout-forceatlas2/worker') : null;

// ── MUI icon SVG paths (viewBox 0 0 24 24) ───────────────────────────────
const MUI_ICON_PATHS: Record<string, string> = {
    // Business icon — PrivateCompany
    PrivateCompany: 'M12 7V3H2v18h20V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8zm-2-8h-2v2h2zm0 4h-2v2h2z',
    // DomainAdd icon — PublicCompany
    PublicCompany: 'M12 7V3H2v18h14v-2h-4v-2h2v-2h-2v-2h2v-2h-2V9h8v6h2V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm14 12v2h-2v2h-2v-2h-2v-2h2v-2h2v2zm-6-8h-2v2h2zm0 4h-2v2h2z',
    // AccountBalance icon — Institution
    Institution: 'M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z',
    // Person icon — Person
    Person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4',
    // Assignment icon — Tender
    Tender: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m2 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z',
};

function makeIconDataUri(nodeType: string): string {
    const path = MUI_ICON_PATHS[nodeType];
    if (!path) return '';
    // Explicit width/height ensures the image renders at a predictable size when loaded
    // via <img> (data URIs without .svg extension are loaded with loadRasterImage).
    // btoa (base64) is more reliable than percent-encoding for SVG data URIs.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><path fill="white" d="${path}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Node size / color by type ─────────────────────────────────────────────
const NODE_TYPE_CONFIG: Record<string, { color: string; size: number }> = {
    PublicCompany: {color: '#1976d2', size: 22},
    PrivateCompany: {color: '#388e3c', size: 12},
    Institution: {color: '#7b1fa2', size: 26},
    Person: {color: '#f57c00', size: 14},
    Tender: {color: '#0097a7', size: 18},
};

const DEFAULT_NODE = {color: '#546e7a', size: 10};

// ── Edge color by type ────────────────────────────────────────────────────
const EDGE_TYPE_CONFIG: Record<string, { color: string; size: number }> = {
    Contract: {color: '#64b5f6', size: 1.5},
    Employment: {color: '#78909c', size: 1.0},
    Official: {color: '#78909c', size: 1.0},
    Director: {color: '#ff1667', size: 1.2},
    Shareholder: {color: '#ff1667', size: 1.2},
    Spouse: {color: '#ffcc02', size: 1.0},
};

const DEFAULT_EDGE = {color: '#546e7a', size: 0.8};

// Draw node label centered below the node circle instead of to its right.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawNodeLabelBottom(context: CanvasRenderingContext2D, data: any, settings: any): void {
    if (!data.label) return;
    const size: number = settings.labelSize;
    const font: string = settings.labelFont;
    const weight: string = settings.labelWeight ?? 'normal';
    const color: string = settings.labelColor?.attribute
        ? (data[settings.labelColor.attribute] ?? settings.labelColor.color ?? '#000')
        : (settings.labelColor?.color ?? '#000');
    context.fillStyle = color;
    context.font = `${weight} ${size}px ${font}`;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(data.label, data.x, data.y + data.size + 3);
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
}

interface XY {
    x: number;
    y: number
}

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
        for (const pos of existingPositions.values()) {
            cx += pos.x;
            cy += pos.y;
        }
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
            anchor = {x: cx, y: cy};
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
                map.set(id, {x: attrs.x, y: attrs.y});
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
                image: data.image,
                pictogramColor: '#ffffff',
                type: 'icon',
            };
        };
    }

    function buildEdgeReducer() {
        return (_edge: string, data: Record<string, unknown>) => {
            const cfg = EDGE_TYPE_CONFIG[data.type as string] ?? DEFAULT_EDGE;
            return {
                color: cfg.color,
                size: cfg.size,
                label: formatEdgeLabel(data),
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
            settings: {
                gravity: 1,
                scalingRatio: 50, // Increased from 8
                slowDown: 10,     // Slightly faster convergence
                adjustSizes: true, // Crucial: prevents overlap based on node size
                strongGravityMode: true // Keeps clusters tighter while internal nodes push apart
            },
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
        if (!containerRef.current || !SigmaLib || !SigmaRendering || !NodeImageLib) return;

        const Sigma = SigmaLib.default ?? SigmaLib.Sigma ?? SigmaLib;
        const {EdgeArrowProgram, NodeCircleProgram, createNodeCompoundProgram} = SigmaRendering;
        const {createNodeImageProgram} = NodeImageLib;

        // Compound program: colored circle background + white MUI icon overlay.
        // crossOrigin: null — avoids CORS attribute being set on data: URIs (causes silent
        // load failures in Firefox/Safari when crossOrigin="anonymous" is used on data URIs).
        const WhiteIconProgram = createNodeImageProgram({
            keepWithinCircle: true,
            size: {mode: 'force', value: 64},
            drawingMode: 'color',
            correctCentering: true,
            colorAttribute: 'pictogramColor',
            crossOrigin: null,
            padding: 0.25,
        });
        const NodeIconProgram = createNodeCompoundProgram([NodeCircleProgram, WhiteIconProgram]);

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const graph: MultiDirectedGraph = new (require('graphology').MultiDirectedGraph)();
        graphRef.current = graph;

        const sigma: SigmaInstance = new Sigma(graph, containerRef.current, {
            renderLabels: true,
            renderEdgeLabels: true,
            defaultEdgeType: 'arrow',
            defaultNodeType: 'icon',
            itemSizeRatio: 1.0, // if you remove it, nodes will stay the same when zoom in or out
            labelFont: 'Arial, Roboto, sans-serif',
            labelSize: 10,
            labelColor: { color: '#e0e0e0' },
            labelDensity: 0.07,
            labelGridCellSize: 60,
            labelRenderedSizeThreshold: 6,
            defaultDrawNodeLabel: drawNodeLabelBottom,
            edgeLabelFont: 'Arial, Roboto, sans-serif',
            edgeLabelSize: 9,
            edgeLabelColor: { color: '#aaaaaa' },
            stagePadding: 30,
            edgeProgramClasses: { arrow: EdgeArrowProgram },
            nodeProgramClasses: { icon: NodeIconProgram },
            nodeReducer: buildNodeReducer(selectedNodeRef.current),
            edgeReducer: buildEdgeReducer(),
            zIndex: true,
        });

        sigma.on('clickNode', (payload: { node: string }) => {
            selectedNodeRef.current = payload.node;
            sigma.setSettings({nodeReducer: buildNodeReducer(payload.node)});
            const attrs = graph.getNodeAttributes(payload.node);
            onNodeClick(payload.node, {id: payload.node, ...attrs} as CytoscapeNodeData);
        });

        sigma.on('clickStage', () => {
            selectedNodeRef.current = null;
            sigma.setSettings({nodeReducer: buildNodeReducer(null)});
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
                const {id, ...attrs} = node.data;
                graph.mergeNode(id, {
                    ...attrs,
                    image: makeIconDataUri(attrs.type as string),
                    x: (Math.random() - 0.5) * 1000,
                    y: (Math.random() - 0.5) * 1000,
                });
            }
        } else {
            // Place new nodes near their connected anchors (gives FA2 a sensible start)
            const prePositions = placeNewNodesNearAnchors(newNodes, elements.edges, existingPositions);
            for (const node of newNodes) {
                const {id, ...attrs} = node.data;
                const pos = prePositions.get(id) ?? {x: (Math.random() - 0.5) * 500, y: (Math.random() - 0.5) * 500};
                graph.mergeNode(id, {...attrs, image: makeIconDataUri(attrs.type as string), x: pos.x, y: pos.y});
            }
        }

        for (const edge of newEdges) {
            const {id, source, target, ...attrs} = edge.data;
            if (!graph.hasEdge(id)) graph.addEdgeWithKey(id, source, target, attrs);
        }

        if (isFirstLoad && fa2 && graph.order > 0) {
            // Synchronous warm-up pass so initial render is already reasonable
            const fa2fn = fa2.default ?? fa2;
            fa2fn(graph, {iterations: 200, settings: {gravity: 1, scalingRatio: 8, slowDown: 10}});
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
            style={{width: '100%', height: '100%', background: '#0a0a0a'}}
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

// Show the contract value as the edge label (e.g. "€1.2M", "€45,000").
// For non-contract edges (Employment, Director, etc.) fall back to the role label.
function formatEdgeLabel(data: Record<string, unknown>): string | null {
    const value = data.value;
    if (typeof value === 'number' && value > 0) {
        if (value >= 1_000_000) {
            return `€${(value / 1_000_000).toFixed(1)}M`;
        }
        if (value >= 1_000) {
            return `€${Math.round(value).toLocaleString('lt-LT')}`;
        }
        return `€${Math.round(value)}`;
    }
    // Non-monetary edges: show role label (Buyer/Supplier/Director/etc.)
    return (data.label as string | null) ?? null;
}
