'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Container, Typography, Paper, Grid, Divider, Box, Button, Table,
    TableBody, TableCell, TableHead, TableRow, Chip, Stack, Skeleton, Link as MuiLink,
    TablePagination,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { EntityDetailResponse } from '@/types/api';

const EmployeeTrendChart = dynamic(() => import('@/components/charts/EmployeeTrendChart'), { ssr: false });
const ProcurementBarChart = dynamic(() => import('@/components/charts/ProcurementBarChart'), { ssr: false });

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
    if (displayScore >= 200) return 'Critical — Escalate';
    if (displayScore >= 150) return 'High — Alert triggered';
    if (displayScore >= 100) return 'Moderate — Manual review';
    if (displayScore >= 50) return 'Minor — Monitor';
    return 'None — No signals';
}

function statusChipColor(status: string | null): 'success' | 'error' | 'default' {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('veikian')) return 'success';
    if (s.includes('likvid') || s.includes('išbraukt')) return 'error';
    return 'default';
}

function flagSeverityColor(severity: string): 'error' | 'warning' | 'default' {
    if (severity === 'critical') return 'error';
    if (severity === 'high') return 'warning';
    return 'default';
}

function roleBadgeColor(role: string): 'primary' | 'secondary' | 'default' {
    if (role === 'owner' || role === 'ubo') return 'primary';
    if (role === 'ceo') return 'secondary';
    return 'default';
}

// ── props ─────────────────────────────────────────────────────────────────────

interface EntityDetailViewProps {
    /** Company registry code (jarKodas) to load */
    jarKodas: string;
    /** Called when the user clicks "Back to Graph" */
    onBack: () => void;
    /** Called when the user clicks "Expand in Graph" for a counterparty — navigates to graph with that entity */
    onExpandInGraph?: (jarKodas: string) => void;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function EntityDetailView({ jarKodas, onBack, onExpandInGraph }: EntityDetailViewProps) {
    const [entity, setEntity] = useState<EntityDetailResponse | null>(null);
    const [courtPage, setCourtPage] = useState(0);
    const [allCourtRecords, setAllCourtRecords] = useState<EntityDetailResponse['recentCourtRecords']>([]);

    useEffect(() => {
        setEntity(null);
        setAllCourtRecords([]);
        setCourtPage(0);
        fetch(`/api/entities/${jarKodas}`)
            .then(res => res.json())
            .then((data: EntityDetailResponse) => {
                setEntity(data);
                setAllCourtRecords(data.recentCourtRecords);
            })
            .catch(err => console.error('Entity profile fetch error:', err));
    }, [jarKodas]);

    const lifetimeBuyer = entity?.procurementYears?.reduce((s, y) => s + y.asBuyerEur, 0) ?? 0;
    const lifetimeSupplier = entity?.procurementYears?.reduce((s, y) => s + y.asSupplierEur, 0) ?? 0;

    const trendData = (entity?.sodraHistory ?? []).map(h => ({
        month: h.month.slice(0, 7),
        employees: h.employees,
    }));

    const handleExportJson = () => {
        const blob = new Blob([JSON.stringify(entity, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jarKodas}-entity.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!entity) {
        return (
            <Container maxWidth="lg" sx={{ mt: 10 }}>
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 1 }} />
                <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 1 }} />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 10, mb: 6 }}>
            {/* ── Identity Header ─────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Button startIcon={<ArrowBackIcon />} onClick={onBack} size="small" sx={{ mb: 1 }}>
                        Back to Graph
                    </Button>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{entity.name}</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 0.5, fontFamily: 'monospace' }}>
                            {entity.jarKodas}
                        </Typography>
                        {entity.legalForm && <Chip label={entity.legalForm} size="small" variant="outlined" />}
                        {entity.status && <Chip label={entity.status} size="small" color={statusChipColor(entity.status)} />}
                        <MuiLink
                            href={`https://viespirkiai.org/asmuo/${entity.jarKodas}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: 12 }}
                        >
                            viespirkiai.org <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </MuiLink>
                    </Stack>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        {entity.registeredAt && (
                            <Typography variant="caption" color="text.secondary">
                                Registered: {formatDate(entity.registeredAt)}{companyAgeLabel(entity.registeredAt)}
                            </Typography>
                        )}
                        {entity.address && <Typography variant="caption" color="text.secondary">{entity.address}</Typography>}
                        {entity.dataAsOf && <Typography variant="caption" color="text.disabled">Data as of: {formatDate(entity.dataAsOf)}</Typography>}
                    </Stack>
                </Box>
                <Button variant="outlined" size="small" onClick={handleExportJson}>Export JSON</Button>
            </Box>

            <Grid container spacing={3}>
                {/* ── Risk Score ──────────────────────────────────────────── */}
                <Grid size={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Risk Score</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" sx={{ gap: 3, alignItems: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    width: 90, height: 90, borderRadius: '50%', display: 'flex',
                                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: riskBandColor(entity.displayScore), color: 'white',
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{Math.round(entity.displayScore)}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.85 }}>display</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h6" color={riskBandColor(entity.displayScore)}>
                                    {riskBandLabel(entity.displayScore)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Raw score: {Math.round(entity.riskScore)}</Typography>
                            </Box>
                        </Stack>
                        {entity.riskFlags.length === 0 ? (
                            <Typography variant="body2" color="success.main">✓ No active risk signals detected</Typography>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Flag</TableCell>
                                        <TableCell>Severity</TableCell>
                                        <TableCell align="right">Score</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entity.riskFlags.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{f.id}</Typography></TableCell>
                                            <TableCell><Chip label={f.severity} size="small" color={flagSeverityColor(f.severity)} /></TableCell>
                                            <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 'bold' }}>+{f.score}</Typography></TableCell>
                                            <TableCell><Typography variant="caption">{f.description}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </Grid>

                {/* ── Substance + Procurement ──────────────────────────────── */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Substance (SODRA)</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                            {[
                                { label: 'Employees', value: entity.employeeCount ?? '—', warn: (entity.employeeCount ?? 999) < 5 },
                                { label: 'Avg Salary', value: entity.avgSalary ? formatEur(entity.avgSalary) + '/mo' : '—', warn: false },
                                { label: 'Monthly Contributions', value: entity.monthlyContributions ? formatEur(entity.monthlyContributions) : '—', warn: false },
                                { label: 'Salary Expenses', value: entity.totalSalaryExpenses ? formatEur(entity.totalSalaryExpenses) : '—', warn: false },
                            ].map(item => (
                                <Grid key={item.label} size={6}>
                                    <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                        <Typography variant="h6" color={item.warn ? 'error.main' : 'text.primary'}>
                                            {String(item.value)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                        {entity.substanceRatio !== null && entity.substanceRatio !== undefined && (
                            <Box sx={{ mb: 2, p: 1, bgcolor: entity.substanceRatio > 10 ? 'error.light' : 'action.hover', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">Substance Ratio</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    {entity.substanceRatio.toFixed(1)}×
                                    {entity.substanceRatio > 10 && <Typography component="span" color="error.main"> ⚠ {entity.substanceRatio.toFixed(1)}× above payroll</Typography>}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Contract value ÷ estimated annual payroll
                                </Typography>
                            </Box>
                        )}
                        {trendData.length > 0 ? (
                            <>
                                <Typography variant="caption" color="text.secondary">Workforce Trend</Typography>
                                <EmployeeTrendChart data={trendData} />
                            </>
                        ) : (
                            <Typography variant="caption" color="text.disabled">No SODRA history available — pending ETL enrichment.</Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Procurement Footprint</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" sx={{ gap: 3, mb: 2 }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{formatEur(lifetimeBuyer)}</Typography>
                                <Typography variant="caption" color="text.secondary">Lifetime Buyer</Typography>
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{formatEur(lifetimeSupplier)}</Typography>
                                <Typography variant="caption" color="text.secondary">Lifetime Supplier</Typography>
                            </Box>
                        </Stack>
                        {entity.procurementYears.length > 0 ? (
                            <ProcurementBarChart data={entity.procurementYears} />
                        ) : (
                            <Typography variant="caption" color="text.disabled">No procurement history available — pending ETL enrichment.</Typography>
                        )}
                    </Paper>
                </Grid>

                {/* ── Top Counterparties ───────────────────────────────────── */}
                {entity.topCounterparties.length > 0 && (
                    <Grid size={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Top Counterparties</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>JAR</TableCell>
                                        <TableCell align="right">Total (EUR)</TableCell>
                                        <TableCell align="right">Contracts</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entity.topCounterparties.map((cp, i) => (
                                        <TableRow key={cp.counterpartyJar}>
                                            <TableCell>{i + 1}</TableCell>
                                            <TableCell>{cp.counterpartyName}</TableCell>
                                            <TableCell>
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{cp.counterpartyJar}</Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatEur(cp.totalEur)}</TableCell>
                                            <TableCell align="right">{cp.contractCount}</TableCell>
                                            <TableCell>
                                                {onExpandInGraph ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => onExpandInGraph(cp.counterpartyJar)}
                                                    >
                                                        Expand in Graph
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>
                )}

                {/* ── Legal Exposure ───────────────────────────────────────── */}
                <Grid size={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Legal Exposure</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Chip label={`Total: ${entity.courtSummary.total}`} size="small" />
                            <Chip label={`Defendant: ${entity.courtSummary.asDefendant}`} size="small" color={entity.courtSummary.asDefendant > 0 ? 'error' : 'default'} />
                            <Chip label={`Plaintiff: ${entity.courtSummary.asPlaintiff}`} size="small" />
                            <Chip label={`Third Party: ${entity.courtSummary.asThirdParty}`} size="small" />
                        </Stack>
                        {allCourtRecords.length > 0 ? (
                            <>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Case Number</TableCell>
                                            <TableCell>Court</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Role</TableCell>
                                            <TableCell align="right">Citations</TableCell>
                                            <TableCell>Doc</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {allCourtRecords
                                            .slice(courtPage * 20, courtPage * 20 + 20)
                                            .map(c => (
                                                <TableRow
                                                    key={c.id}
                                                    sx={{ bgcolor: c.roleInCase === 'Atsakovas' ? 'error.light' : undefined }}
                                                >
                                                    <TableCell><Typography variant="caption">{formatDate(c.date)}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{c.caseNumber}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{c.court}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{c.caseType}</Typography></TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={c.roleInCase}
                                                            size="small"
                                                            color={c.roleInCase === 'Atsakovas' ? 'error' : 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">{c.citationCount}</TableCell>
                                                    <TableCell>
                                                        {c.documentUrl && (
                                                            <MuiLink href={c.documentUrl} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12 }}>
                                                                ↗
                                                            </MuiLink>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    component="div"
                                    count={allCourtRecords.length}
                                    page={courtPage}
                                    onPageChange={(_, p) => setCourtPage(p)}
                                    rowsPerPage={20}
                                    rowsPerPageOptions={[20]}
                                />
                            </>
                        ) : (
                            <Typography variant="caption" color="text.disabled">No court records — pending ETL enrichment.</Typography>
                        )}
                    </Paper>
                </Grid>

                {/* ── Ownership & Relationships ────────────────────────────── */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Ownership & Relationships</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {entity.relationships.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No relationships on record.</Typography>
                        ) : (
                            entity.relationships.map(r => (
                                <Box key={r.id} sx={{ mb: 1.5 }}>
                                    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                                        <Typography variant="subtitle2">{r.person.fullName}</Typography>
                                        <Chip label={r.role.toUpperCase()} size="small" color={roleBadgeColor(r.role)} />
                                        {r.person.displayScore > 50 && (
                                            <Chip label={`Risk: ${Math.round(r.person.displayScore)}`} size="small" color="warning" />
                                        )}
                                    </Stack>
                                    {(r.since || r.until) && (
                                        <Typography variant="caption" color="text.secondary">
                                            {r.since ? formatDate(r.since) : '?'} → {r.until ? formatDate(r.until) : 'present'}
                                        </Typography>
                                    )}
                                </Box>
                            ))
                        )}
                    </Paper>
                </Grid>

                {/* ── Fleet ───────────────────────────────────────────────── */}
                {entity.vehicleCount != null && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Physical Assets (Fleet)</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{entity.vehicleCount}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>registered vehicles (Regitra)</Typography>
                            <Typography variant="caption" color="text.disabled">
                                Full vehicle list requires ETL enrichment.
                            </Typography>
                        </Paper>
                    </Grid>
                )}

                {/* ── Recent Contracts ─────────────────────────────────────── */}
                {entity.contracts.length > 0 && (
                    <Grid size={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Recent Contracts (as Supplier)</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Title</TableCell>
                                        <TableCell>Buyer</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Value</TableCell>
                                        <TableCell>Signed</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entity.contracts.map(c => (
                                        <TableRow key={c.contractId}>
                                            <TableCell><Typography variant="caption">{c.title}</Typography></TableCell>
                                            <TableCell><Typography variant="caption">{c.buyerName}</Typography></TableCell>
                                            <TableCell><Typography variant="caption">{c.status}</Typography></TableCell>
                                            <TableCell align="right">{formatEur(c.value)}</TableCell>
                                            <TableCell><Typography variant="caption">{formatDate(c.signedAt)}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Disclaimer */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Risk scores are probabilistic indicators based on publicly available Lithuanian government data (CC BY 4.0).
                    They are not legal determinations. Source: viespirkiai.org.
                </Typography>
            </Box>
        </Container>
    );
}
