'use client';

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEntityDetail } from '@/components/services/useEntityDetail';
import type { EntityDetailViewProps } from './types';

const TYPE_COLORS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default'
> = {
  PublicCompany: 'primary',
  PrivateCompany: 'success',
  Institution: 'secondary',
  Person: 'warning',
  Tender: 'info',
};

const PRETTY_KEYS: Record<string, string> = {
  employees: 'Employees',
  avgSalary: 'Avg Salary (EUR)',
  contractTotal: 'Contract Total (EUR)',
  contractCount: 'Contract Count',
  fromDate: 'From',
  tillDate: 'Till',
  expanded: 'Expanded',
  role: 'Role',
  rysioPradzia: 'Relationship Start',
  rysioPabaiga: 'Relationship End',
  pareiguTipasPavadinimas: 'Position Type',
};

function formatMetaValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number' && (key === 'contractTotal' || key === 'avgSalary')) {
    return val.toLocaleString('lt-LT', { maximumFractionDigits: 0 });
  }
  return String(val);
}

export function EntityDetailView({ entityId }: EntityDetailViewProps) {
  // Normalize bare jarKodas (e.g. "110053842") to "org:110053842"
  const normalizedId = /^\d{5,10}$/.test(entityId) ? `org:${entityId}` : entityId;
  const { data, isLoading, isError, error, refetch } = useEntityDetail(normalizedId);

  const handleBack = () => {
    window.location.hash = '#/';
  };

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to Graph
        </Button>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  const typeColor = TYPE_COLORS[data.type] ?? 'default';
  const dataEntries = Object.entries(data.data ?? {}).filter(
    ([k]) => k !== 'id' && k !== 'label' && k !== 'type',
  );

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: 'auto',
        p: 3,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
      >
        Back to Graph
      </Button>

      {/* Header */}
      <Card elevation={2}>
        <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
              {data.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={data.type}
                color={typeColor}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip label={data.id} variant="outlined" size="small" sx={{ fontFamily: 'monospace' }} />
            </Box>
          </Box>

          {/* Risk Score */}
          <Card
            variant="outlined"
            sx={{ minWidth: 160, textAlign: 'center', background: '#1a1a2e' }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Risk Score
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }} color="text.disabled">
                —
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Not yet available
              </Typography>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Metadata */}
      {dataEntries.length > 0 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
              Details
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Table size="small">
              <TableBody>
                {dataEntries.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell
                      sx={{ color: 'text.secondary', border: 'none', width: '40%', py: 0.5 }}
                    >
                      {PRETTY_KEYS[key] ?? key}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, border: 'none', py: 0.5 }}>
                      {formatMetaValue(key, value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      {data.relationships && data.relationships.length > 0 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
              Relationships ({data.relationships.length})
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {data.relationships.map((rel, idx) => (
                <Card key={idx} variant="outlined" sx={{ background: '#0d0d1a' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={rel.type} size="small" />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {rel.targetLabel}
                      </Typography>
                      {rel.label && (
                        <Typography variant="body2" color="text.secondary">
                          — {rel.label}
                        </Typography>
                      )}
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        {rel.fromDate && (
                          <Typography variant="caption" color="text.disabled">
                            {rel.fromDate}
                          </Typography>
                        )}
                        {rel.tillDate && (
                          <Typography variant="caption" color="text.disabled">
                            → {rel.tillDate}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
