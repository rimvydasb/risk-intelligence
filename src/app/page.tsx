'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import AppHeader, { type SearchResultOption } from '@/components/AppHeader';
import GraphView from '@/components/GraphView';
import NodeDetails, { type SelectedGraphNode } from '@/components/NodeDetails';
import EntityDetailView from '@/components/entity/EntityDetailView';
import {
    useHashRouter, parseRoute, buildGraphUrl, activeFilterCount,
    FILTER_DEFAULTS, type GraphFilterParams,
} from '@/lib/useHashRouter';
import type { EntityDetailResponse } from '@/types/api';

const YEAR_OPTIONS = Array.from({ length: FILTER_DEFAULTS.yearTo - 2009 }, (_, i) => 2010 + i);

// ── component ─────────────────────────────────────────────────────────────────

export default function GraphExplorer() {
    const { route, navigate, queryParams, setQueryParams } = useHashRouter();
    const parsedRoute = parseRoute(route);
    const isEntityView = parsedRoute.view === 'entity';

    // Applied filters (drive the actual graph fetch)
    const [appliedFilters, setAppliedFilters] = useState<GraphFilterParams>(() => ({
        yearFrom: Number(queryParams.yearFrom) || FILTER_DEFAULTS.yearFrom,
        yearTo: Number(queryParams.yearTo) || FILTER_DEFAULTS.yearTo,
        minValue: Number(queryParams.minValue) || FILTER_DEFAULTS.minValue,
    }));

    // Pending filters (what the user has typed but not yet applied)
    const [pendingFilters, setPendingFilters] = useState<GraphFilterParams>(appliedFilters);

    const graphDataUrl = useMemo(
        () => buildGraphUrl('/api/entities/initial', appliedFilters),
        [appliedFilters],
    );

    const filterBadgeCount = activeFilterCount(appliedFilters);

    const handleApplyFilters = useCallback(() => {
        setAppliedFilters({ ...pendingFilters });
        setQueryParams({
            ...(pendingFilters.yearFrom !== FILTER_DEFAULTS.yearFrom ? { yearFrom: pendingFilters.yearFrom } : {}),
            ...(pendingFilters.yearTo !== FILTER_DEFAULTS.yearTo ? { yearTo: pendingFilters.yearTo } : {}),
            ...(pendingFilters.minValue !== FILTER_DEFAULTS.minValue ? { minValue: pendingFilters.minValue } : {}),
        });
    }, [pendingFilters, setQueryParams]);

    // ── Search + graph interaction state ─────────────────────────────────────
    const [selectedNode, setSelectedNode] = useState<SelectedGraphNode | null>(null);
    const [entityDetail, setEntityDetail] = useState<EntityDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResultOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [flagged, setFlagged] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleSearch = useCallback(async (val: string) => {
        abortControllerRef.current?.abort();

        if (val.length > 2) {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`, { signal: controller.signal });
                const data = await res.json();
                setSearchResults(data);
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        } else {
            setSearchResults([]);
        }
    }, []);

    const handleNodeClick = useCallback(async (nodeData: SelectedGraphNode) => {
        setSelectedNode(nodeData);
        setSidebarOpen(true);
        setEntityDetail(null);
        setDetailLoading(false);
        setFlagged(false);

        if (nodeData?.id && nodeData?.type !== 'person') {
            setDetailLoading(true);
            try {
                const res = await fetch(`/api/entities/${nodeData.id}`);
                if (res.ok) {
                    const data: EntityDetailResponse = await res.json();
                    setEntityDetail(data);
                }
            } catch (err) {
                console.error('Entity detail fetch error:', err);
            } finally {
                setDetailLoading(false);
            }
        }
    }, []);

    const handleSearchInputChange = useCallback((value: string) => {
        void handleSearch(value);
    }, [handleSearch]);

    const handleSearchSelect = useCallback((option: SearchResultOption | null) => {
        const nodeId = option?.jarKodas || option?.uid;
        if (!nodeId) {
            return;
        }

        void handleNodeClick({
            id: nodeId,
            label: option.name || option.fullName,
            type: option.jarKodas ? 'company' : 'person',
        });
    }, [handleNodeClick]);

    const handleYearFromChange = useCallback((value: number) => {
        setPendingFilters((currentFilters) => ({ ...currentFilters, yearFrom: value }));
    }, []);

    const handleYearToChange = useCallback((value: number) => {
        setPendingFilters((currentFilters) => ({ ...currentFilters, yearTo: value }));
    }, []);

    const handleMinValueChange = useCallback((value: number) => {
        setPendingFilters((currentFilters) => ({ ...currentFilters, minValue: value }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setPendingFilters(FILTER_DEFAULTS);
        setAppliedFilters(FILTER_DEFAULTS);
        setQueryParams({});
    }, [setQueryParams]);

    const handleCloseNodeDetails = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    const handleToggleFlag = useCallback(() => {
        setFlagged((value) => !value);
    }, []);

    const handleViewFullProfile = useCallback((jarKodas: string) => {
        setSidebarOpen(false);
        navigate(`/entities/${jarKodas}`);
    }, [navigate]);

    return (
        <Box sx={{ flexGrow: 1 }}>
            {/* Entity Detail View (hash route: /entities/:id) */}
            {isEntityView && parsedRoute.view === 'entity' && (
                <EntityDetailView
                    jarKodas={parsedRoute.id}
                    onBack={() => {
                        navigate('/');
                        setSidebarOpen(false);
                    }}
                    onExpandInGraph={(jar) => {
                        navigate('/');
                        void handleNodeClick({ id: jar, type: 'company' });
                    }}
                />
            )}

            {/* Graph Dashboard (always mounted; hidden when on entity route to preserve Cytoscape state) */}
            <Box sx={{ display: isEntityView ? 'none' : 'block' }}>
                <AppHeader
                    searchResults={searchResults}
                    loading={loading}
                    pendingFilters={pendingFilters}
                    filterBadgeCount={filterBadgeCount}
                    yearOptions={YEAR_OPTIONS}
                    onSearchInputChange={handleSearchInputChange}
                    onSearchSelect={handleSearchSelect}
                    onYearFromChange={handleYearFromChange}
                    onYearToChange={handleYearToChange}
                    onMinValueChange={handleMinValueChange}
                    onApplyFilters={handleApplyFilters}
                    onResetFilters={handleResetFilters}
                />

                {/* Graph Canvas */}
                <GraphView onNodeClick={handleNodeClick} dataUrl={graphDataUrl} />

                <NodeDetails
                    open={sidebarOpen}
                    selectedNode={selectedNode}
                    entityDetail={entityDetail}
                    detailLoading={detailLoading}
                    flagged={flagged}
                    onClose={handleCloseNodeDetails}
                    onToggleFlag={handleToggleFlag}
                    onViewFullProfile={handleViewFullProfile}
                />
            </Box> {/* end graph dashboard wrapper */}
        </Box>
    );
}
