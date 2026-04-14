'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  AppBar,
  Typography,
  InputLabel,
  FormControl,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HubIcon from '@mui/icons-material/Hub';
import type { CytoscapeNodeData, CytoscapeElements } from '@/types/graph';
import type { FilterState } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => 2010 + i);

export interface GraphToolbarProps {
  elements: CytoscapeElements;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onNodeSelect: (nodeId: string, data: CytoscapeNodeData) => void;
  onBalanceGraph?: () => void;
}

export function GraphToolbar({
  elements,
  filters,
  onApplyFilters,
  onNodeSelect,
  onBalanceGraph,
}: GraphToolbarProps) {
  const [localYearFrom, setLocalYearFrom] = useState<number | ''>( filters.year ?? '');
  const [localYearTo, setLocalYearTo] = useState<number | ''>('');
  const [localMinValue, setLocalMinValue] = useState<string>(
    filters.minContractValue !== undefined ? String(filters.minContractValue) : '',
  );

  const isNonDefault =
    localYearFrom !== '' || localYearTo !== '' || localMinValue !== '';

  const nodeOptions = useMemo(
    () =>
      elements.nodes
        .filter((n) => n.data.expanded !== false || n.data.type !== 'Person')
        .map((n) => ({ id: n.data.id, label: n.data.label ?? n.data.id })),
    [elements.nodes],
  );

  const handleApply = useCallback(() => {
    const newFilters: FilterState = {};
    if (localYearFrom !== '') newFilters.year = Number(localYearFrom);
    if (localYearTo !== '') newFilters.yearTo = Number(localYearTo);
    if (localMinValue !== '') newFilters.minContractValue = Number(localMinValue);
    onApplyFilters(newFilters);
  }, [localYearFrom, localYearTo, localMinValue, onApplyFilters]);

  const handleReset = useCallback(() => {
    setLocalYearFrom('');
    setLocalYearTo('');
    setLocalMinValue('');
    onApplyFilters({});
  }, [onApplyFilters]);

  // Sync from external filter changes
  useEffect(() => {
    setLocalYearFrom(filters.year ?? '');
    setLocalYearTo(filters.yearTo ?? '');
    setLocalMinValue(filters.minContractValue !== undefined ? String(filters.minContractValue) : '');
  }, [filters]);

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ background: '#1a1a2e' }}>
      <Toolbar variant="dense" sx={{ gap: 1.5, flexWrap: 'wrap', py: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#e0e0e0', mr: 1, fontSize: '1rem' }}>
          Risk Intelligence
        </Typography>

        {/* Search */}
        <Autocomplete
          options={nodeOptions}
          getOptionLabel={(o) => o.label}
          onChange={(_e, val) => {
            if (val) {
              const node = elements.nodes.find((n) => n.data.id === val.id);
              if (node) onNodeSelect(val.id, node.data);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search Company or Person..."
              size="small"
              variant="outlined"
              sx={{ background: '#0d0d1a', borderRadius: 1 }}
            />
          )}
          sx={{ width: 260 }}
          noOptionsText="No matches"
          size="small"
        />

        {/* Year From */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Year from</InputLabel>
          <Select
            label="Year from"
            value={localYearFrom}
            onChange={(e) => setLocalYearFrom(e.target.value as number | '')}
            SelectDisplayProps={{ 'data-testid': 'filter-year-from' } as React.HTMLAttributes<HTMLDivElement>}
            size="small"
          >
            <MenuItem value=""><em>Any</em></MenuItem>
            {YEAR_OPTIONS.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Year To */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Year to</InputLabel>
          <Select
            label="Year to"
            value={localYearTo}
            onChange={(e) => setLocalYearTo(e.target.value as number | '')}
            SelectDisplayProps={{ 'data-testid': 'filter-year-to' } as React.HTMLAttributes<HTMLDivElement>}
            size="small"
          >
            <MenuItem value=""><em>Any</em></MenuItem>
            {YEAR_OPTIONS.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Min contract value */}
        <TextField
          label="Min value (EUR)"
          value={localMinValue}
          onChange={(e) => setLocalMinValue(e.target.value)}
          size="small"
          type="number"
          slotProps={{ input: { inputProps: { 'data-testid': 'filter-min-value', min: 0 } } }}
          sx={{ width: 140, background: '#0d0d1a', borderRadius: 1 }}
        />

        {/* Apply */}
        <Button
          variant="contained"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={handleApply}
          data-testid="filter-apply"
        >
          Apply
        </Button>

        {/* Reset — only shown when non-default */}
        {isNonDefault && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            data-testid="filter-reset"
          >
            Reset
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Balance Graph — re-layout all nodes with fCOSE */}
        {onBalanceGraph && elements.nodes.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<HubIcon />}
            onClick={onBalanceGraph}
            data-testid="balance-graph"
            sx={{ color: '#90caf9', borderColor: '#90caf9' }}
          >
            Balance
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
