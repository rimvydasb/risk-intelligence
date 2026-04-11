'use client';

import dynamic from 'next/dynamic';
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { EntityDetailResponse } from '@/types/api';

const SparkLine = dynamic(() => import('@/components/charts/SparkLine'), { ssr: false });

export interface SelectedGraphNode {
    id: string;
    label?: string;
    type?: string;
    risk?: number;
}

interface NodeDetailsProps {
    open: boolean;
    selectedNode: SelectedGraphNode | null;
    entityDetail: EntityDetailResponse | null;
    detailLoading: boolean;
    flagged: boolean;
    onClose: () => void;
    onToggleFlag: () => void;
    onViewFullProfile: (jarKodas: string) => void;
}

function formatEur(value: number): string {
    if (value >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `EUR ${(value / 1_000).toFixed(0)}k`;
    return `EUR ${value.toFixed(0)}`;
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
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('veikian')) return 'success';
    if (normalizedStatus.includes('likvid') || normalizedStatus.includes('išbraukt')) return 'error';
    return 'default';
}

export default function NodeDetails({
    open,
    selectedNode,
    entityDetail,
    detailLoading,
    flagged,
    onClose,
    onToggleFlag,
    onViewFullProfile,
}: NodeDetailsProps) {
    const lifetimeBuyer = entityDetail?.procurementYears?.reduce((sum, year) => sum + year.asBuyerEur, 0) ?? 0;
    const lifetimeSupplier = entityDetail?.procurementYears?.reduce((sum, year) => sum + year.asSupplierEur, 0) ?? 0;
    const sparkData = (entityDetail?.sodraHistory ?? [])
        .slice(-12)
        .map((historyPoint) => ({ month: historyPoint.month.slice(0, 7), value: historyPoint.employees }));
    const displayFlags = entityDetail?.riskFlags ?? [];
    const visibleFlags = displayFlags.slice(0, 3);
    const extraFlagCount = displayFlags.length - visibleFlags.length;

    return (
        <Box
            data-testid="node-details"
            aria-hidden={!open}
            sx={{
                position: 'fixed',
                top: 64,
                right: 0,
                width: 400,
                height: 'calc(100vh - 64px)',
                overflowY: 'auto',
                bgcolor: 'background.paper',
                borderLeft: 1,
                borderColor: 'divider',
                boxShadow: 6,
                zIndex: (theme) => theme.zIndex.appBar - 1,
                transform: open ? 'translateX(0)' : 'translateX(100%)',
                opacity: open ? 1 : 0,
                visibility: open ? 'visible' : 'hidden',
                pointerEvents: open ? 'auto' : 'none',
                transition: 'transform 200ms ease, opacity 200ms ease, visibility 200ms ease',
            }}
        >
            <Box sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Node Details</Typography>
                    <IconButton size="small" onClick={onClose} data-testid="close-sidebar">
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
                        <Box data-testid="sidebar-identity-header" sx={{ mb: 1.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                {entityDetail.name}
                            </Typography>
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        bgcolor: 'action.hover',
                                        px: 0.75,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        fontFamily: 'monospace',
                                    }}
                                >
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
                                    Registered: {formatDate(entityDetail.registeredAt)}
                                    {companyAgeLabel(entityDetail.registeredAt)}
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

                        <Box sx={{ my: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Risk Profile</Typography>
                                    <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
                                        <Typography
                                            variant="h4"
                                            sx={{ fontWeight: 'bold' }}
                                            color={riskBandColor(entityDetail.displayScore)}
                                        >
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
                                        <Typography variant="caption" color="success.main">No active flags</Typography>
                                    ) : (
                                        <Typography variant="caption" color="error.main">
                                            {displayFlags.length} flag{displayFlags.length > 1 ? 's' : ''}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                            {visibleFlags.length > 0 && (
                                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                    {visibleFlags.map((flag) => (
                                        <Chip
                                            key={flag.id}
                                            label={`${flag.id.replace(/_/g, ' ')} +${flag.score}`}
                                            size="small"
                                            color={flagSeverityColor(flag.severity)}
                                        />
                                    ))}
                                    {extraFlagCount > 0 && (
                                        <Chip label={`+${extraFlagCount} more`} size="small" />
                                    )}
                                </Stack>
                            )}
                        </Box>
                        <Divider />

                        <Box sx={{ my: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                SUBSTANCE (SODRA)
                            </Typography>
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

                        {(lifetimeBuyer > 0 || lifetimeSupplier > 0) && (
                            <>
                                <Box sx={{ my: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                        PROCUREMENT
                                    </Typography>
                                    <Stack direction="row" sx={{ gap: 2, mt: 0.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {formatEur(lifetimeBuyer)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Lifetime Buyer</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {formatEur(lifetimeSupplier)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Lifetime Supplier
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    {entityDetail.topCounterparties?.[0] && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                            Top buyer: {entityDetail.topCounterparties[0].counterpartyName}
                                            {' '}
                                            ({formatEur(entityDetail.topCounterparties[0].totalEur)})
                                        </Typography>
                                    )}
                                </Box>
                                <Divider />
                            </>
                        )}

                        {entityDetail.courtSummary.total > 0 && (
                            <>
                                <Box sx={{ my: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                        LEGAL EXPOSURE
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {entityDetail.courtSummary.total} court records
                                        {entityDetail.courtSummary.asDefendant > 0 && (
                                            <Typography component="span" color="error.main">
                                                {' '}
                                                | Defendant: {entityDetail.courtSummary.asDefendant}
                                            </Typography>
                                        )}
                                    </Typography>
                                    {entityDetail.recentCourtRecords?.[0] && (
                                        <Typography variant="caption" color="text.secondary">
                                            Recent: {entityDetail.recentCourtRecords[0].caseNumber}
                                            {' · '}
                                            {entityDetail.recentCourtRecords[0].court}
                                        </Typography>
                                    )}
                                </Box>
                                <Divider />
                            </>
                        )}

                        {entityDetail.vehicleCount != null && (
                            <>
                                <Box sx={{ my: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Fleet: {entityDetail.vehicleCount} vehicles
                                    </Typography>
                                </Box>
                                <Divider />
                            </>
                        )}

                        <Stack sx={{ gap: 1, mt: 1.5 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={() => onViewFullProfile(entityDetail.jarKodas)}
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
                                    onClick={onToggleFlag}
                                >
                                    {flagged ? 'Flagged' : 'Flag'}
                                </Button>
                            </Stack>
                        </Stack>

                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontStyle: 'italic', lineHeight: 1.4, display: 'block', mt: 2 }}
                        >
                            Risk scores are probabilistic indicators, not legal determinations. Data: CC BY 4.0.
                        </Typography>
                    </Box>
                )}

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
        </Box>
    );
}
