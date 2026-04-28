'use client';

import React from 'react';
import {
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type {GraphEdge, GraphNodeData} from '@/types/graph';

const SIDEBAR_WIDTH = 320;

const TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
    PublicCompany: 'primary',
    PrivateCompany: 'success',
    Institution: 'secondary',
    Person: 'warning',
    Tender: 'info',
};

const METADATA_LABELS: Record<string, string> = {
    expanded: 'Expanded',
    employees: 'Employees',
    avgSalary: 'Avg Salary (EUR)',
    contractTotal: 'Contract Total (EUR)',
    contractCount: 'Contract Count',
    fromDate: 'From',
    tillDate: 'Till',
    role: 'Role',
};

function formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' && (key === 'contractTotal' || key === 'avgSalary')) {
        return value.toLocaleString('lt-LT', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    }
    return String(value);
}

function formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return date;
}

export interface NodeSidebarProps {
    nodeId: string | null;
    nodeData: GraphNodeData | null;
    edges?: GraphEdge[];
    onClose: () => void;
    onViewFullProfile: (entityId: string) => void;
}

export function NodeSidebar({nodeId, nodeData, edges = [], onClose, onViewFullProfile}: NodeSidebarProps) {
    const open = !!nodeId;
    const typeColor = nodeData ? (TYPE_COLORS[nodeData.type] ?? 'default') : 'default';
    const metaKeys = nodeData
        ? Object.keys(METADATA_LABELS).filter(
              (k) => nodeData[k] !== undefined && k !== 'id' && k !== 'label' && k !== 'type',
          )
        : [];

    // Group edges by type
    const edgesByType = edges.reduce<Record<string, GraphEdge[]>>((acc, edge) => {
        const type = edge.data.type ?? 'Unknown';
        (acc[type] ??= []).push(edge);
        return acc;
    }, {});
    const edgeTypes = Object.keys(edgesByType).sort();

    return (
        <Drawer
            anchor="right"
            open={open}
            variant="persistent"
            sx={{
                width: open ? SIDEBAR_WIDTH : 0,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: SIDEBAR_WIDTH,
                    boxSizing: 'border-box',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            {open && (
                <Box sx={{p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto'}}>
                    {/* Header */}
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Node Details
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={onClose}
                            data-testid="close-sidebar"
                            aria-label="Close sidebar"
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {nodeData && (
                        <>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
                                <Typography variant="body1" sx={{fontWeight: 600, flexGrow: 1}}>
                                    {nodeData.label}
                                </Typography>
                                <Chip label={nodeData.type} color={typeColor} size="small" sx={{fontWeight: 600}} />
                            </Box>

                            <Divider />

                            {/* Metadata */}
                            {metaKeys.length > 0 && (
                                <Table size="small" sx={{'& td': {py: 0.5, px: 0}}}>
                                    <TableBody>
                                        {metaKeys.map((key) => (
                                            <TableRow key={key}>
                                                <TableCell sx={{color: 'text.secondary', border: 'none', pr: 1}}>
                                                    {METADATA_LABELS[key]}
                                                </TableCell>
                                                <TableCell sx={{fontWeight: 500, border: 'none'}}>
                                                    {formatValue(key, nodeData[key])}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            <Divider />

                            {/* Relationships */}
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Relationships
                                </Typography>
                                {edgeTypes.length === 0 ? (
                                    <Typography variant="body2" color="text.disabled">
                                        No relationships
                                    </Typography>
                                ) : (
                                     edgeTypes.map((type) => (
                                        <Box key={type} sx={{mb: 1.5}} data-testid={`relationship-group-${type}`}>
                                            <Typography variant="caption" sx={{fontWeight: 600, color: 'text.secondary'}} data-testid="relationship-type">
                                                {type} ({edgesByType[type].length})
                                            </Typography>
                                            <Table size="small" sx={{'& td': {py: 0.25, px: 0}}}>
                                                <TableBody>
                                                    {edgesByType[type].map((edge) => (
                                                        <TableRow key={edge.data.id}>
                                                            <TableCell sx={{border: 'none', fontWeight: 500, pr: 1}}>
                                                                {edge.data.label || type}
                                                            </TableCell>
                                                            <TableCell sx={{border: 'none', color: 'text.secondary', whiteSpace: 'nowrap'}}>
                                                                <span data-testid="edge-from-date">{formatDate(edge.data.fromDate)}</span>
                                                                {' – '}
                                                                <span data-testid="edge-till-date">{edge.data.tillDate ? formatDate(edge.data.tillDate) : 'present'}</span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    ))
                                )}
                            </Box>

                            <Divider />

                            {/* View Full Profile */}
                            <Box
                                component="button"
                                onClick={() => nodeId && onViewFullProfile(nodeId)}
                                sx={{
                                    mt: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    background: 'transparent',
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    borderRadius: 1,
                                    color: 'primary.main',
                                    cursor: 'pointer',
                                    py: 1,
                                    px: 2,
                                    fontFamily: 'inherit',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    '&:hover': {background: 'action.hover'},
                                }}
                            >
                                <OpenInNewIcon fontSize="small" />
                                View Full Profile
                            </Box>
                        </>
                    )}
                </Box>
            )}
        </Drawer>
    );
}
