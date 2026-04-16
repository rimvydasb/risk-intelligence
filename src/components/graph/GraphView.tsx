'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {Box, CircularProgress, Alert, Typography, Button} from '@mui/material';
import {GraphToolbar} from './toolbar/GraphToolbar';
import {GraphDataTable} from './GraphDataTable';
import {NodeSidebar} from './NodeSidebar';
import {useExpandOrg} from '@/components/services/useExpandOrg';
import {useHealthcheck} from '@/components/services/useHealthcheck';
import {useHashRouter} from '@/hooks/useHashRouter';
import type {GraphElements, GraphNodeData} from '@/types/graph';
import type {FilterState} from './types';

const SigmaCanvas = dynamic(() => import('./SigmaCanvas'), {ssr: false});

const ANCHOR_JAR_KODAS = '110053842';

const EMPTY_ELEMENTS: GraphElements = {nodes: [], edges: []};

function mergeElements(existing: GraphElements, incoming: GraphElements): GraphElements {
    const nodeIds = new Set(existing.nodes.map((n) => n.data.id));
    const edgeIds = new Set(existing.edges.map((e) => e.data.id));
    return {
        nodes: [...existing.nodes, ...incoming.nodes.filter((n) => !nodeIds.has(n.data.id))],
        edges: [...existing.edges, ...incoming.edges.filter((e) => !edgeIds.has(e.data.id))],
    };
}

interface GraphViewProps {
    viewMode?: 'graph' | 'table';
}

export default function GraphView({viewMode = 'graph'}: GraphViewProps) {
    const {replace, navigate} = useHashRouter();
    const [graphElements, setGraphElements] = useState<GraphElements>(EMPTY_ELEMENTS);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodeData, setSelectedNodeData] = useState<GraphNodeData | null>(null);
const now = new Date();
    const defaultYearFrom = `${now.getFullYear() - 1}-01-01`;
    const defaultYearTo = `${now.getFullYear()}-12-31`;
    const [filters, setFilters] = useState<FilterState>({yearFrom: defaultYearFrom, yearTo: defaultYearTo});
    const [expandTarget, setExpandTarget] = useState<string>(ANCHOR_JAR_KODAS);
    const [balanceTrigger, setBalanceTrigger] = useState(0);
    const cyRef = useRef(null);

    const {data: health, isLoading: healthLoading, refetch: retryHealth} = useHealthcheck();
    const {data: expandData, error: expandError, isLoading} = useExpandOrg(expandTarget, filters);

    // Merge newly fetched elements into graph
    useEffect(() => {
        if (expandData?.elements) {
            setGraphElements((prev) => mergeElements(prev, expandData.elements));
        }
    }, [expandData]);

    const handleNodeClick = useCallback((nodeId: string, nodeData: GraphNodeData) => {
        // If stub org node — expand it
        if (nodeData.expanded === false && nodeData.type !== 'Person') {
            const jarKodas = nodeId.replace('org:', '');
            setExpandTarget(jarKodas);
        }
        setSelectedNodeId(nodeId);
        setSelectedNodeData(nodeData);
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedNodeData(null);
    }, []);

    const handleApplyFilters = useCallback(
        (newFilters: FilterState) => {
            setFilters(newFilters);
            setExpandTarget(ANCHOR_JAR_KODAS);
            setGraphElements(EMPTY_ELEMENTS);
            const params: Record<string, string> = {};
            if (newFilters.yearFrom) params.yearFrom = newFilters.yearFrom;
            if (newFilters.yearTo) params.yearTo = newFilters.yearTo;
            if (newFilters.minContractValue) params.minContractValue = String(newFilters.minContractValue);
            replace('/', Object.keys(params).length > 0 ? params : undefined);
        },
        [replace],
    );

    const handleViewFullProfile = useCallback(
        (entityId: string) => {
            navigate(`/entities/${encodeURIComponent(entityId)}`);
        },
        [navigate],
    );

    const handleBalanceGraph = useCallback(() => {
        setBalanceTrigger((prev) => prev + 1);
    }, []);

    // ── Health gate: show clear error if DB is unreachable ──────────────
    if (healthLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography color="text.secondary">Connecting to database…</Typography>
            </Box>
        );
    }

    if (health?.status === 'error' || (health && !health.database)) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: 3,
                    p: 4,
                }}
            >
                <Alert severity="error" sx={{maxWidth: 600, width: '100%'}}>
                    <Typography variant="subtitle1" sx={{fontWeight: 600, mb: 1}}>
                        Database is not running
                    </Typography>
                    <Typography variant="body2">
                        {health?.error ?? 'Unable to connect to the PostgreSQL database.'}
                    </Typography>
                    <Typography variant="body2" sx={{mt: 1, color: 'text.secondary'}}>
                        Please ensure PostgreSQL is running and the <code>DATABASE_URL</code> environment variable is
                        set correctly, then retry.
                    </Typography>
                </Alert>
                <Button variant="outlined" onClick={() => retryHealth()}>
                    Retry Connection
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden'}}>
            <GraphToolbar
                elements={graphElements}
                filters={filters}
                viewMode={viewMode}
                onApplyFilters={handleApplyFilters}
                onBalanceGraph={handleBalanceGraph}
                onNodeSelect={(nodeId, data) => {
                    setSelectedNodeId(nodeId);
                    setSelectedNodeData(data);
                }}
            />

            {expandError && (
                <Alert severity="warning" sx={{mx: 2, mt: 1}}>
                    Failed to load graph data: {(expandError as Error).message}
                </Alert>
            )}

            <Box sx={{display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative'}}>
                {viewMode === 'table' ? (
                    <GraphDataTable elements={graphElements} />
                ) : (
                    <Box sx={{flexGrow: 1, position: 'relative'}}>
                        {isLoading && graphElements.nodes.length === 0 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(248,250,252,0.7)',
                                    zIndex: 10,
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        )}
                        <SigmaCanvas
                            elements={graphElements}
                            onNodeClick={handleNodeClick}
                            onBackgroundClick={handleBackgroundClick}
                            cyRef={cyRef}
                            balanceTrigger={balanceTrigger}
                        />
                    </Box>
                )}

                {viewMode === 'graph' && (
                    <NodeSidebar
                        nodeId={selectedNodeId}
                        nodeData={selectedNodeData}
                        onClose={handleBackgroundClick}
                        onViewFullProfile={handleViewFullProfile}
                    />
                )}
            </Box>
        </Box>
    );
}
