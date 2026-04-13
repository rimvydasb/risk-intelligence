'use client';

import React, { useEffect, useRef } from 'react';
import type { CytoscapeElements, CytoscapeNodeData } from '@/types/graph';

// Cytoscape is browser-only; imported at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cytoscape = typeof window !== 'undefined' ? require('cytoscape') : null;

const NODE_STYLES = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
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
    style: { 'background-color': '#1976d2', width: 60, height: 60, shape: 'ellipse' },
  },
  {
    selector: 'node[type="PrivateCompany"]',
    style: { 'background-color': '#388e3c', width: 50, height: 50, shape: 'ellipse' },
  },
  {
    selector: 'node[type="Institution"]',
    style: { 'background-color': '#7b1fa2', width: 70, height: 70, shape: 'hexagon' },
  },
  {
    selector: 'node[type="Person"]',
    style: { 'background-color': '#f57c00', width: 35, height: 35, shape: 'ellipse' },
  },
  {
    selector: 'node[type="Tender"]',
    style: { 'background-color': '#0097a7', width: 45, height: 45, shape: 'diamond' },
  },
  {
    selector: 'node[?expanded="false"], node[expanded="false"]',
    style: { opacity: 0.6 },
  },
  {
    selector: ':selected',
    style: { 'border-color': '#ffeb3b', 'border-width': 3 },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      label: 'data(label)',
      'font-size': '9px',
      color: '#bdbdbd',
      'text-rotation': 'autorotate',
    },
  },
  {
    selector: 'edge[type="Contract"]',
    style: { 'line-color': '#ef5350', 'target-arrow-color': '#ef5350', width: 3 },
  },
  {
    selector: 'edge[type="Employment"]',
    style: {
      'line-color': '#90a4ae',
      'target-arrow-color': '#90a4ae',
      width: 1.5,
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[type="Director"]',
    style: {
      'line-color': '#f48fb1',
      'target-arrow-color': '#f48fb1',
      width: 2.5,
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[type="Official"]',
    style: {
      'line-color': '#80cbc4',
      'target-arrow-color': '#80cbc4',
      width: 1.5,
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[type="Shareholder"]',
    style: {
      'line-color': '#ce93d8',
      'target-arrow-color': '#ce93d8',
      width: 2,
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[type="Spouse"]',
    style: {
      'line-color': '#ffcc02',
      'target-arrow-color': '#ffcc02',
      width: 1,
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
      layout: { name: 'preset' },
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
      layout: (opts: unknown) => { run: () => void; stop: () => void };
      getElementById: (id: string) => { length: number };
    } | null;
    if (!cy || !elements) return;

    const toAdd = [
      ...elements.nodes.filter((n) => cy.getElementById(n.data.id).length === 0),
      ...elements.edges.filter((e) => cy.getElementById(e.data.id).length === 0),
    ];

    if (toAdd.length > 0) {
      layoutRef.current?.stop();
      cy.add(toAdd);
      const layout = cy.layout({ name: 'cose', animate: false });
      layoutRef.current = layout;
      layout.run();
    }
  }, [elements]);

  return (
    <div
      ref={containerRef}
      data-testid="graph-container"
      style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
    />
  );
}
