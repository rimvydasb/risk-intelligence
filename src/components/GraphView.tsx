'use client';

import {useEffect, useRef, useState} from 'react';
import Box from '@mui/material/Box';
import type {Core, ElementDefinition} from 'cytoscape';

export interface GraphViewProps {
    onNodeClick?: (nodeData: any) => void;
    elements?: ElementDefinition[];
    dataUrl?: string;
}

export default function GraphView({onNodeClick, elements: passedElements, dataUrl}: GraphViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const onNodeClickRef = useRef<typeof onNodeClick>(onNodeClick);
    const [elements, setElements] = useState<ElementDefinition[]>([]);

    useEffect(() => {
        onNodeClickRef.current = onNodeClick;
    }, [onNodeClick]);

    useEffect(() => {
        if (passedElements) {
            setElements(passedElements);
            return;
        }
        async function fetchInitialData() {
            const url = dataUrl ?? '/api/entities/initial';
            const res = await fetch(url);
            const data = await res.json();
            setElements(data);
        }
        fetchInitialData();
    }, [passedElements, dataUrl]);

    useEffect(() => {
        let cy: Core | null = null;

        async function initCytoscape() {
            if (!containerRef.current || elements.length === 0) return;

            const cytoscape = (await import('cytoscape')).default;
            const fcose = (await import('cytoscape-fcose')).default;

            cytoscape.use(fcose);

            cy = cytoscape({
                container: containerRef.current,
                elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            label: 'data(label)',
                            'background-color': '#42a5f5',
                            color: '#1e293b',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-margin-y': 8,
                            width: 'mapData(risk, 0, 100, 20, 60)',
                            height: 'mapData(risk, 0, 100, 20, 60)',
                            shape: 'ellipse',
                            'font-size': 8,
                            'border-width': 1,
                            'border-color': '#cbd5e1',
                            'transition-property': 'background-color, line-color, target-arrow-color',
                            'transition-duration': 0.3,
                        },
                    },
                    {
                        selector: 'node[type="company"]',
                        style: {
                            'background-color': '#10b981',
                            'border-color': '#059669',
                        },
                    },
                    {
                        selector: 'node[type="person"]',
                        style: {
                            'background-color': '#f59e0b',
                            'border-color': '#d97706',
                        },
                    },
                    {
                        selector: 'node[type="buyer"]',
                        style: {
                            'background-color': '#8b5cf6',
                            'border-color': '#7c3aed',
                            shape: 'hexagon',
                        },
                    },
                    {
                        selector: 'node:selected',
                        style: {
                            'border-width': 1,
                            'border-color': '#1e293b',
                        },
                    },
                    {
                        selector: 'edge',
                        style: {
                            label: 'data(label)',
                            width: 0.5,
                            'line-color': '#94a3b8',
                            'target-arrow-color': '#94a3b8',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'font-size': 7,
                            'text-margin-y': 5,
                            'text-rotation': 'autorotate',
                            'opacity': 0.9,
                        },
                    },
                    {
                        selector: 'edge[type="contract"]',
                        style: {
                            'line-style': 'dashed',
                            'line-color': '#94a3b8',
                        },
                    },
                ],
                layout: {
                    name: 'fcose',
                    animate: true,
                    randomize: true,
                    padding: 60,
                    nodeRepulsion: (_node: any) => 45000,
                    idealEdgeLength: (_edge: any) => 100,
                    edgeElasticity: (_edge: any) => 0.45,
                    nestingFactor: 0.1,
                    numIter: 2500,
                    gravity: 0.25,
                    initialEnergyOnIncremental: 0.3,
                } as any,
            });

            cy.on('tap', 'node', (evt) => {
                const node = evt.target;
                if (onNodeClickRef.current) {
                    onNodeClickRef.current(node.data());
                }
            });

            cyRef.current = cy;
        }

        initCytoscape();

        return () => {
            cy?.destroy();
            cyRef.current = null;
        };
    }, [elements]);

    return (
        <Box
            ref={containerRef}
            data-testid="graph-container"
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                bgcolor: '#f5f5f5',
                zIndex: 0,
            }}
        />
    );
}
