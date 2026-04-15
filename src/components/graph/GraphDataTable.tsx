'use client';

import React from 'react';
import { Box } from '@mui/material';
import { GraphNodesTable } from './GraphNodesTable';
import { GraphEdgesTable } from './GraphEdgesTable';
import type { CytoscapeElements } from '@/types/graph';

interface GraphDataTableProps {
  elements: CytoscapeElements;
}

export function GraphDataTable({ elements }: GraphDataTableProps) {
  return (
    <Box sx={{ overflowY: 'auto', height: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <GraphNodesTable nodes={elements.nodes} />
      <GraphEdgesTable edges={elements.edges} />
    </Box>
  );
}
