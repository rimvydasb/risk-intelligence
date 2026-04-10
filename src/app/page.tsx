'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Box, AppBar, Toolbar, Typography, TextField, Autocomplete,
    Drawer, IconButton, Divider, CircularProgress, Stack, Chip,
    Button, Skeleton, Link as MuiLink,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GraphView from '@/components/GraphView';
import EntityDetailView from '@/components/entity/EntityDetailView';
import { useHashRouter, parseRoute } from '@/lib/useHashRouter';
import type { EntityDetailResponse } from '@/types/api';

const SparkLine = dynamic(() => import('@/components/charts/SparkLine'), { ssr: false });

// ── helpers ───────────────────────────────────────────────────────────────────

function formatEur(value: number): string {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}k`;
    return `€${value.toFixed(0)}`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toISOString().slice(0, 10);
}

function companyAgeLabel(registeredAt: string | null): string {
    if (!registeredAt) return '';
    const years = Math.floor((Date.now() - new Date(registeredAt).getTime()) / (365.25 * 24 * 3600 * 1000));
    return ` (${years} yr${years !== 1 ? 's' : ''})`;
}

function riskBandColor(displayScore: number): string {
    if (displayScore >= 200) return '#b71c1c';
    if (displayScore >= 150) return '#e65100';
    if (displayScore >= 100) return '#f9a825';
    if (displayScore >= 50) return '#2e7d32';
    return '#757575';
}

function riskBandLabel(displayScore: number): string {
    if (displayScore >= 200) return 'Critical';
    if (displayScore >= 150) return 'High';
    if (displayScore >= 100) return 'Moderate';
    if (displayScore >= 50) return 'Minor';
    return 'None';
}

function flagSeverityColor(severity: string): 'error' | 'warning' | 'default' {
    if (severity === 'critical') return 'error';
    if (severity === 'high') return 'warning';
    return 'default';
}

function statusChipColor(status: string | null): 'success' | 'error' | 'default' {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('veikian')) return 'success';
    if (s.includes('likvid') || s.includes('išbraukt')) return 'error';
    return 'default';
}

// ── component ─────────────────────────────────────────────────────────────────

export default function GraphExplorer() {
    const { route, navigate } = useHashRouter();
    const parsedRoute = parseRoute(route);
    const isEntityView = parsedRoute.view === 'entity';

    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [entityDetail, setEntityDetail] = useState<EntityDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [flagged, setFlagged] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleSearch = async (val: string) => {
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
    };

    const handleNodeClick = async (nodeData: any) => {
        setSelectedNode(nodeData);
        setSidebarOpen(true);
        setEntityDetail(null);
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
    };

    // Procurement lifetime totals
    const lifetimeBuyer = entityDetail?.procurementYears?.reduce((s, y) => s + y.asBuyerEur, 0) ?? 0;
    const lifetimeSupplier = entityDetail?.procurementYears?.reduce((s, y) => s + y.asSupplierEur, 0) ?? 0;

    // Sparkline data (last 12 months of sodraHistory)
    const sparkData = (entityDetail?.sodraHistory ?? [])
        .slice(-12)
        .map(h => ({ month: h.month.slice(0, 7), value: h.employees }));

    const displayFlags = entityDetail?.riskFlags ?? [];
    const visibleFlags = displayFlags.slice(0, 3);
    const extraFlagCount = displayFlags.length - visibleFlags.length;

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
                        handleNodeClick({ id: jar, type: 'company' });
                    }}
                />
            )}

            {/* Graph Dashboard (always mounted; hidden when on entity route to preserve Cytoscape state) */}
            <Box sx={{ display: isEntityView ? 'none' : 'block' }}>
            {/* Top Bar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(255,255,255,0.9)', color: 'text.primary' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ mr: 4, fontWeight: 'bold', color: 'primary.main' }}>
                        RISK INTEL
                    </Typography>
                    <Autocomplete
                        freeSolo
                        filterOptions={(x) => x}
                        sx={{ width: 400 }}
                        options={searchResults}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : (option.name || option.fullName || '')}
                        onInputChange={(_, value) => handleSearch(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Search Company or Person..."
                                slotProps={{
                                    ...params.slotProps,
                                    input: {
                                        ...params.slotProps?.input,
                                        startAdornment: (
                                            <>
                                                <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                                {(params.slotProps?.input as any)?.startAdornment}
                                            </>
                                        ),
                                        endAdornment: (
                                            <>
                                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                                {(params.slotProps?.input as any)?.endAdornment}
                                            </>
                                        ),
                                    },
                                }}
                            />
                        )}
                        onChange={(_, value: any) => {
                            if (value && typeof value !== 'string') {
                                handleNodeClick({
                                    id: value.jarKodas || value.uid,
                                    label: value.name || value.fullName,
                                    type: value.jarKodas ? 'company' : 'person',
                                });
                            }
                        }}
                    />
                </Toolbar>
            </AppBar>

            {/* Graph Canvas */}
            <GraphView onNodeClick={handleNodeClick} />

            {/* Slide-out Sidebar */}
            <Drawer
                anchor="right"
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                sx={{
                    width: 400,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 400,
                        boxSizing: 'border-box',
                        mt: '64px',
                        height: 'calc(100% - 64px)',
                        overflowY: 'auto',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    {/* Drawer header */}
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Entity Details</Typography>
                        <IconButton size="small" onClick={() => setSidebarOpen(false)} data-testid="close-sidebar">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                    <Divider />

                    {detailLoading && (
                        <Box sx={{ mt: 2 }}>
                            <Skeleton variant="text" width="80%" height={28} />
                            <Skeleton variant="text" width="50%" />
                            <Skeleton variant="rectangular" height={60} sx={{ mt: 1, borderRadius: 1 }} />
                            <Skeleton variant="rectangular" height={50} sx={{ mt: 1, borderRadius: 1 }} />
                            <Skeleton variant="rectangular" height={50} sx={{ mt: 1, borderRadius: 1 }} />
                        </Box>
                    )}

                    {!detailLoading && entityDetail && (
                        <Box sx={{ mt: 1.5 }}>
                            {/* ── Section 1: Identity Header ───────────────── */}
                            <Box data-testid="sidebar-identity-header" sx={{ mb: 1.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                    {entityDetail.name}
                                </Typography>
                                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                                    <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace' }}>
                                        {entityDetail.jarKodas}
                                    </Typography>
                                    {entityDetail.legalForm && (
                                        <Chip label={entityDetail.legalForm} size="small" variant="outlined" />
                                    )}
                                    {entityDetail.status && (
                                        <Chip
                                            label={entityDetail.status}
                                            size="small"
                                            color={statusChipColor(entityDetail.status)}
                                        />
                                    )}
                                </Stack>
                                {entityDetail.registeredAt && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Registered: {formatDate(entityDetail.registeredAt)}{companyAgeLabel(entityDetail.registeredAt)}
                                    </Typography>
                                )}
                                {entityDetail.address && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {entityDetail.address}
                                    </Typography>
                                )}
                                {entityDetail.dataAsOf && (
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                        Data as of: {formatDate(entityDetail.dataAsOf)}
                                    </Typography>
                                )}
                            </Box>
                            <Divider />

                            {/* ── Section 2: Risk Score ────────────────────── */}
                            <Box sx={{ my: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Risk Profile</Typography>
                                        <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
                                            <Typography variant="h4" sx={{ fontWeight: 'bold' }} color={riskBandColor(entityDetail.displayScore)}>
                                                {Math.round(entityDetail.displayScore)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {riskBandLabel(entityDetail.displayScore)}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                            Raw: {Math.round(entityDetail.riskScore)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        {displayFlags.length === 0 ? (
                                            <Typography variant="caption" color="success.main">✓ No active flags</Typography>
                                        ) : (
                                            <Typography variant="caption" color="error.main">{displayFlags.length} flag{displayFlags.length > 1 ? 's' : ''}</Typography>
                                        )}
                                    </Box>
                                </Stack>
                                {visibleFlags.length > 0 && (
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                        {visibleFlags.map(f => (
                                            <Chip
                                                key={f.id}
                                                label={`${f.id.replace(/_/g, ' ')} +${f.score}`}
                                                size="small"
                                                color={flagSeverityColor(f.severity)}
                                            />
                                        ))}
                                        {extraFlagCount > 0 && (
                                            <Chip label={`+${extraFlagCount} more`} size="small" />
                                        )}
                                    </Stack>
                                )}
                            </Box>
                            <Divider />

                            {/* ── Section 3: Substance / SODRA ────────────── */}
                            <Box sx={{ my: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>SUBSTANCE (SODRA)</Typography>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                                    <Box>
                                        <Typography
                                            variant="h5"
                                            sx={{ fontWeight: 'bold' }}
                                            color={(entityDetail.employeeCount ?? 999) < 5 ? 'error.main' : 'text.primary'}
                                        >
                                            {entityDetail.employeeCount ?? '—'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">employees</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        {entityDetail.avgSalary && (
                                            <>
                                                <Typography variant="body2">{formatEur(entityDetail.avgSalary)}/mo avg</Typography>
                                                <Typography variant="caption" color="text.secondary">avg salary</Typography>
                                            </>
                                        )}
                                    </Box>
                                </Stack>
                                {entityDetail.monthlyContributions && (
                                    <Typography variant="caption" color="text.secondary">
                                        Monthly contributions: {formatEur(entityDetail.monthlyContributions)}
                                    </Typography>
                                )}
                                {sparkData.length > 0 && (
                                    <Box sx={{ mt: 0.5 }}>
                                        <SparkLine data={sparkData} />
                                    </Box>
                                )}
                            </Box>
                            <Divider />

                            {/* ── Section 4: Procurement KPIs ─────────────── */}
                            {(lifetimeBuyer > 0 || lifetimeSupplier > 0) && (
                                <>
                                    <Box sx={{ my: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>PROCUREMENT</Typography>
                                        <Stack direction="row" sx={{ gap: 2, mt: 0.5 }}>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatEur(lifetimeBuyer)}</Typography>
                                                <Typography variant="caption" color="text.secondary">Lifetime Buyer</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatEur(lifetimeSupplier)}</Typography>
                                                <Typography variant="caption" color="text.secondary">Lifetime Supplier</Typography>
                                            </Box>
                                        </Stack>
                                        {entityDetail.topCounterparties?.[0] && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                Top buyer: {entityDetail.topCounterparties[0].counterpartyName} ({formatEur(entityDetail.topCounterparties[0].totalEur)})
                                            </Typography>
                                        )}
                                    </Box>
                                    <Divider />
                                </>
                            )}

                            {/* ── Section 5: Legal Exposure ────────────────── */}
                            {entityDetail.courtSummary.total > 0 && (
                                <>
                                    <Box sx={{ my: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>LEGAL EXPOSURE</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            {entityDetail.courtSummary.total} court records
                                            {entityDetail.courtSummary.asDefendant > 0 && (
                                                <Typography component="span" color="error.main"> | Defendant: {entityDetail.courtSummary.asDefendant}</Typography>
                                            )}
                                        </Typography>
                                        {entityDetail.recentCourtRecords?.[0] && (
                                            <Typography variant="caption" color="text.secondary">
                                                Recent: {entityDetail.recentCourtRecords[0].caseNumber} · {entityDetail.recentCourtRecords[0].court}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Divider />
                                </>
                            )}

                            {/* ── Section 7: Fleet ─────────────────────────── */}
                            {entityDetail.vehicleCount != null && (
                                <>
                                    <Box sx={{ my: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            🚗 Fleet: {entityDetail.vehicleCount} vehicles
                                        </Typography>
                                    </Box>
                                    <Divider />
                                </>
                            )}

                            {/* ── Section 8: Actions ───────────────────────── */}
                            <Stack sx={{ gap: 1, mt: 1.5 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        navigate(`/entities/${entityDetail.jarKodas}`);
                                    }}
                                    endIcon={<OpenInNewIcon fontSize="small" />}
                                >
                                    View Full Profile
                                </Button>
                                <Stack direction="row" sx={{ gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        onClick={() => alert('Path finder coming soon')}
                                    >
                                        Find Path to…
                                    </Button>
                                    <Button
                                        variant={flagged ? 'contained' : 'outlined'}
                                        color={flagged ? 'warning' : 'inherit'}
                                        size="small"
                                        fullWidth
                                        onClick={() => setFlagged(v => !v)}
                                    >
                                        {flagged ? '⚑ Flagged' : '⚐ Flag'}
                                    </Button>
                                </Stack>
                            </Stack>

                            {/* Disclaimer */}
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', lineHeight: 1.4, display: 'block', mt: 2 }}>
                                Risk scores are probabilistic indicators, not legal determinations. Data: CC BY 4.0.
                            </Typography>
                        </Box>
                    )}

                    {/* Fallback for nodes without enriched data (persons, etc.) */}
                    {!detailLoading && !entityDetail && selectedNode && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" color="primary">{selectedNode.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                ID: {selectedNode.id} | Type: {selectedNode.type?.toUpperCase()}
                            </Typography>
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">RISK SCORE</Typography>
                                <Typography variant="h4" color={riskBandColor(selectedNode.risk || 0)}>
                                    {Math.round(selectedNode.risk || 0)}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Drawer>
            </Box> {/* end graph dashboard wrapper */}
        </Box>
    );
}
