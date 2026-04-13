'use client';

import React, {useEffect, useRef} from 'react';
import type {CytoscapeElements, CytoscapeNodeData, FcoseLayoutOptions} from '@/types/graph';

// Cytoscape is browser-only; imported at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cytoscape = typeof window !== 'undefined' ? require('cytoscape') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fcose = typeof window !== 'undefined' ? require('cytoscape-fcose') : null;
if (cytoscape && fcose) cytoscape.use(fcose);

// Build a data URI for a white Material Design icon (viewBox 0 0 24 24)
function svgIcon(pathD: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="${pathD}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// SVG path data extracted directly from @mui/icons-material
const ICONS = {
    Business: 'M12 7V3H2v18h20V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8zm-2-8h-2v2h2zm0 4h-2v2h2z',
    DomainAdd: 'M12 7V3H2v18h14v-2h-4v-2h2v-2h-2v-2h2v-2h-2V9h8v6h2V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm14 12v2h-2v2h-2v-2h-2v-2h2v-2h2v2zm-6-8h-2v2h2zm0 4h-2v2h2z',
    AccountBalance: 'M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z',
    Person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4',
    Assignment: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m2 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z',
};

const iconStyle = {
    'background-width': '65%',
    'background-height': '65%',
    'background-position-x': '50%',
    'background-position-y': '50%',
};

const NODE_STYLES = [
    {
        selector: 'node',
        style: {
            label: 'data(label)',
            'font-family': 'Arial, Roboto, sans-serif',
            'font-size': '10px',
            color: '#e0e0e0',
            'text-wrap': 'ellipsis',
            'text-max-width': '80px',
            'text-valign': 'bottom',
            'text-margin-y': 4,
        },
    },
    {
        selector: 'node[type="PublicCompany"]',
        style: {
            'background-color': '#1976d2',
            width: 60,
            height: 60,
            shape: 'ellipse',
            'font-size': '12px',
            'background-image': svgIcon(ICONS.DomainAdd), ...iconStyle
        },
    },
    {
        selector: 'node[type="PrivateCompany"]',
        style: {
            'background-color': '#388e3c',
            width: 30,
            height: 30,
            shape: 'ellipse',
            'font-size': '8px',
            'background-image': svgIcon(ICONS.Business), ...iconStyle
        },
    },
    {
        selector: 'node[type="Institution"]',
        style: {
            'background-color': '#7b1fa2',
            width: 70,
            height: 70,
            shape: 'hexagon',
            'font-size': '13px',
            'background-image': svgIcon(ICONS.AccountBalance), ...iconStyle
        },
    },
    {
        selector: 'node[type="Person"]',
        style: {
            'background-color': '#f57c00',
            width: 35,
            height: 35,
            shape: 'ellipse',
            'font-size': '8px',
            'background-image': svgIcon(ICONS.Person), ...iconStyle
        },
    },
    {
        selector: 'node[type="Tender"]',
        style: {
            'background-color': '#0097a7',
            width: 45,
            height: 45,
            shape: 'diamond',
            'font-size': '10px',
            'background-image': svgIcon(ICONS.Assignment), ...iconStyle
        },
    },
    {
        selector: 'node[?expanded="false"], node[expanded="false"]',
        style: {opacity: 0.6},
    },
    {
        selector: ':selected',
        style: {'border-color': '#ffeb3b', 'border-width': 3},
    },
    {
        selector: 'edge',
        style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            label: 'data(label)',
            'font-family': 'Arial, Roboto, sans-serif',
            'font-size': '8px',
            width: 0.8,
            color: '#94a3b8',
            // edge must be thin
            'text-wrap': 'ellipsis',
            'text-rotation': 'autorotate',
            'text-margin-y': 15,
        },
    },
    {
        selector: 'edge[type="Contract"]',
        style: {
            width: 0.8
        },
    },
    {
        selector: 'edge[type="Employment"]',
        style: {
            width: 0.8,
            'line-style': 'dashed',
        },
    },
    {
        selector: 'edge[type="Director"]',
        style: {
            'line-color': '#ff1667',
            'target-arrow-color': '#ff1667',
            width: 0.8,
            'line-style': 'dashed',
        },
    },
    {
        selector: 'edge[type="Official"]',
        style: {
            width: 0.8,
            'line-style': 'dashed',
        },
    },
    {
        selector: 'edge[type="Shareholder"]',
        style: {
            'line-color': '#ff1667',
            'target-arrow-color': '#ff1667',
            width: 0.8,
            'line-style': 'dashed',
        },
    },
    {
        selector: 'edge[type="Spouse"]',
        style: {
            'line-color': '#ffcc02',
            'target-arrow-color': '#ffcc02',
            width: 0.8,
            'line-style': 'dotted',
        },
    },
];

export interface CytoscapeCanvasProps {
    elements: CytoscapeElements;
    onNodeClick: (nodeId: string, nodeData: CytoscapeNodeData) => void;
    onBackgroundClick: () => void;
    cyRef?: React.MutableRefObject<unknown>;
}

export default function CytoscapeCanvas({
                                            elements,
                                            onNodeClick,
                                            onBackgroundClick,
                                            cyRef,
                                        }: CytoscapeCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyInstanceRef = useRef<unknown>(null);
    const layoutRef = useRef<{ stop: () => void } | null>(null);

    // Mount Cytoscape once
    useEffect(() => {
        if (!containerRef.current || !cytoscape) return;

        const cy = cytoscape({
            container: containerRef.current,
            elements: [],
            style: NODE_STYLES,
            layout: {name: 'preset'},
        });

        cy.on('tap', 'node', (evt: { target: { id: () => string; data: () => CytoscapeNodeData } }) => {
            onNodeClick(evt.target.id(), evt.target.data());
        });
        cy.on('tap', (evt: { target: unknown }) => {
            if (evt.target === cy) onBackgroundClick();
        });

        cyInstanceRef.current = cy;
        if (cyRef) cyRef.current = cy;

        return () => {
            layoutRef.current?.stop();
            layoutRef.current = null;
            cy.destroy();
            cyInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Merge new elements incrementally
    useEffect(() => {
        const cy = cyInstanceRef.current as {
            add: (el: unknown) => void;
            layout: (opts: FcoseLayoutOptions) => { run: () => void; stop: () => void };
            getElementById: (id: string) => { length: number };
            nodes: () => { length: number };
        } | null;
        if (!cy || !elements) return;

        const existingNodeCount = cy.nodes().length;
        const toAdd = [
            ...elements.nodes.filter((n) => cy.getElementById(n.data.id).length === 0),
            ...elements.edges.filter((e) => cy.getElementById(e.data.id).length === 0),
        ];

        if (toAdd.length > 0) {
            layoutRef.current?.stop();
            cy.add(toAdd);
            const layoutOptions: FcoseLayoutOptions = {
                name: 'fcose',
                quality: 'default',
                randomize: true,              // IMPORTANT: allow better initial placement
                animate: true,
                fit: true,
                padding: 30,

                nodeRepulsion: () => 1500,    // ↓ reduce a lot
                idealEdgeLength: () => 200,   // ↑ increase to balance spacing
                edgeElasticity: () => 0.45,

                gravity: 0.8,                 // ↑ pull nodes inward
                gravityRange: 3.8,

                numIter: 2500,                // ↓ enough for convergence

                tile: true,
                tilingPaddingVertical: 20,
                tilingPaddingHorizontal: 20,

                incremental: false,           // 🔴 disable this
            };
            const layout = cy.layout(layoutOptions);
            layoutRef.current = layout;
            layout.run();
        }
    }, [elements]);

    return (
        <div
            ref={containerRef}
            data-testid="graph-container"
            style={{width: '100%', height: '100%', background: '#0a0a0a'}}
        />
    );
}
