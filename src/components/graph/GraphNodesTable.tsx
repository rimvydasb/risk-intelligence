'use client';

import React from 'react';
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography} from '@mui/material';
import type {CytoscapeNode} from '@/types/graph';

interface GraphNodesTableProps {
    nodes: CytoscapeNode[];
}

function formatExpanded(value: unknown): string {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return '—';
}

function formatDate(value: unknown, nullLabel = '—'): string {
    if (typeof value === 'string' && value) return value;
    return nullLabel;
}

export function GraphNodesTable({nodes}: GraphNodesTableProps) {
    return (
        <TableContainer>
            <Typography variant="subtitle2" sx={{px: 2, pt: 1, fontWeight: 600}}>
                Nodes ({nodes.length})
            </Typography>
            <Table size="small" data-testid="graph-nodes-table">
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Expanded</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>Till</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {nodes.map((node) => (
                        <TableRow key={node.data.id}>
                            <TableCell data-testid="node-id">{node.data.id}</TableCell>
                            <TableCell data-testid="node-label">{node.data.label}</TableCell>
                            <TableCell data-testid="node-type">{node.data.type}</TableCell>
                            <TableCell data-testid="node-expanded">{formatExpanded(node.data.expanded)}</TableCell>
                            <TableCell data-testid="node-from">{formatDate(node.data.fromDate)}</TableCell>
                            <TableCell data-testid="node-till">
                                {node.data.tillDate === null ? 'present' : formatDate(node.data.tillDate)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
