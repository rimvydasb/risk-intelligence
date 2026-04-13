'use client';

import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
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
import type { CytoscapeNodeData } from '@/types/graph';

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
    return value.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return String(value);
}

export interface NodeSidebarProps {
  nodeId: string | null;
  nodeData: CytoscapeNodeData | null;
  loading?: boolean;
  onClose: () => void;
  onViewFullProfile: (entityId: string) => void;
}

export function NodeSidebar({
  nodeId,
  nodeData,
  loading,
  onClose,
  onViewFullProfile,
}: NodeSidebarProps) {
  const open = !!nodeId;
  const typeColor = nodeData ? (TYPE_COLORS[nodeData.type] ?? 'default') : 'default';
  const metaKeys = nodeData
    ? Object.keys(METADATA_LABELS).filter((k) => nodeData[k] !== undefined && k !== 'id' && k !== 'label' && k !== 'type')
    : [];

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
          background: '#1a1a2e',
          borderLeft: '1px solid #333',
        },
      }}
    >
      {open && (
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                {nodeData.label}
              </Typography>
              <Chip
                label={nodeData.type}
                color={typeColor}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Divider />

            {/* Metadata */}
            {metaKeys.length > 0 && (
              <Table size="small" sx={{ '& td': { py: 0.5, px: 0 } }}>
                <TableBody>
                  {metaKeys.map((key) => (
                    <TableRow key={key}>
                      <TableCell sx={{ color: 'text.secondary', border: 'none', pr: 1 }}>
                        {METADATA_LABELS[key]}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, border: 'none' }}>
                        {formatValue(key, nodeData[key])}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Divider />

            {/* Risk Profile */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Risk Profile
              </Typography>
              {loading ? (
                <CircularProgress size={18} />
              ) : (
                <Typography variant="body2" color="text.disabled">
                  Risk scoring is not yet available in v1.
                </Typography>
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
                border: '1px solid #1976d2',
                borderRadius: 1,
                color: '#1976d2',
                cursor: 'pointer',
                py: 1,
                px: 2,
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 500,
                '&:hover': { background: 'rgba(25,118,210,0.08)' },
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
