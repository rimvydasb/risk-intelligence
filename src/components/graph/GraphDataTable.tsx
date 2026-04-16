'use client';

import React from 'react';
import {Box} from '@mui/material';
import {GraphNodesTable} from './GraphNodesTable';
import {GraphEdgesTable} from './GraphEdgesTable';
import type {GraphElements} from '@/types/graph';

interface GraphDataTableProps {
    elements: GraphElements;
}

export function GraphDataTable({elements}: GraphDataTableProps) {
    return (
        <Box sx={{overflowY: 'auto', height: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 3}}>
            <GraphNodesTable nodes={elements.nodes} />
            <GraphEdgesTable edges={elements.edges} />
        </Box>
    );
}
