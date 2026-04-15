'use client';

import React from 'react';
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography} from '@mui/material';
import type {CytoscapeEdge} from '@/types/graph';

interface GraphEdgesTableProps {
    edges: CytoscapeEdge[];
}

function formatEdgeValue(value: unknown): string {
    if (typeof value === 'number' && value > 0) {
        if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `€${Math.round(value).toLocaleString('lt-LT')}`;
        return `€${Math.round(value)}`;
    }
    return '—';
}

function formatDate(value: unknown, nullLabel = '—'): string {
    if (typeof value === 'string' && value) return value;
    return nullLabel;
}

export function GraphEdgesTable({edges}: GraphEdgesTableProps) {
    return (
        <TableContainer>
            <Typography variant="subtitle2" sx={{px: 2, pt: 1, fontWeight: 600}}>
                Edges ({edges.length})
            </Typography>
            <Table size="small" data-testid="graph-edges-table">
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>Till</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {edges.map((edge) => (
                        <TableRow key={edge.data.id}>
                            <TableCell data-testid="edge-id">{edge.data.id}</TableCell>
                            <TableCell data-testid="edge-source">{edge.data.source}</TableCell>
                            <TableCell data-testid="edge-target">{edge.data.target}</TableCell>
                            <TableCell data-testid="edge-type">{edge.data.type}</TableCell>
                            <TableCell data-testid="edge-label">{edge.data.label ?? '—'}</TableCell>
                            <TableCell data-testid="edge-value">{formatEdgeValue(edge.data.value)}</TableCell>
                            <TableCell data-testid="edge-from">{formatDate(edge.data.fromDate)}</TableCell>
                            <TableCell data-testid="edge-till">
                                {edge.data.tillDate === null ? 'present' : formatDate(edge.data.tillDate as unknown)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
