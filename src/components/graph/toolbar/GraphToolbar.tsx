'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HubIcon from '@mui/icons-material/Hub';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type {GraphNodeData, GraphElements} from '@/types/graph';
import type {FilterState} from '../types';
import {useHashRouter} from '@/hooks/useHashRouter';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({length: CURRENT_YEAR - 2009}, (_, i) => 2010 + i);

export interface GraphToolbarProps {
    elements: GraphElements;
    filters: FilterState;
    viewMode?: 'graph' | 'table';
    onApplyFilters: (filters: FilterState) => void;
    onNodeSelect: (nodeId: string, data: GraphNodeData) => void;
    onBalanceGraph?: () => void;
}

export function GraphToolbar({
    elements,
    filters,
    viewMode = 'graph',
    onApplyFilters,
    onNodeSelect,
    onBalanceGraph,
}: GraphToolbarProps) {
    const {navigate, params} = useHashRouter();
    const [localYearFrom, setLocalYearFrom] = useState<number | ''>(
        filters.yearFrom ? new Date(filters.yearFrom).getFullYear() : '',
    );
    const [localYearTo, setLocalYearTo] = useState<number | ''>(
        filters.yearTo ? new Date(filters.yearTo).getFullYear() : '',
    );
    const [localMinValue, setLocalMinValue] = useState<string>(
        filters.minContractValue !== undefined ? String(filters.minContractValue) : '',
    );

    const handleViewModeToggle = useCallback(
        (_: React.MouseEvent<HTMLElement>, newMode: 'graph' | 'table' | null) => {
            if (!newMode || newMode === viewMode) return;
            const filterParams: Record<string, string> = {};
            params.forEach((value, key) => {
                filterParams[key] = value;
            });
            navigate(`/${newMode}/`, Object.keys(filterParams).length > 0 ? filterParams : undefined);
        },
        [navigate, params, viewMode],
    );

    const now = new Date();
    const DEFAULT_YEAR_FROM = now.getFullYear() - 1;
    const DEFAULT_YEAR_TO = now.getFullYear();

    const isNonDefault =
        (localYearFrom !== '' && localYearFrom !== DEFAULT_YEAR_FROM) ||
        (localYearTo !== '' && localYearTo !== DEFAULT_YEAR_TO) ||
        localMinValue !== '';

    const nodeOptions = useMemo(
        () =>
            elements.nodes
                .filter((n) => n.data.expanded !== false || n.data.type !== 'Person')
                .map((n) => ({id: n.data.id, label: n.data.label ?? n.data.id})),
        [elements.nodes],
    );

    const handleApply = useCallback(() => {
        const newFilters: FilterState = {};
        if (localYearFrom !== '') newFilters.yearFrom = `${localYearFrom}-01-01`;
        if (localYearTo !== '') newFilters.yearTo = `${localYearTo}-12-31`;
        if (localMinValue !== '') newFilters.minContractValue = Number(localMinValue);
        onApplyFilters(newFilters);
    }, [localYearFrom, localYearTo, localMinValue, onApplyFilters]);

    const handleReset = useCallback(() => {
        setLocalYearFrom(DEFAULT_YEAR_FROM);
        setLocalYearTo(DEFAULT_YEAR_TO);
        setLocalMinValue('');
        onApplyFilters({});
    }, [DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, onApplyFilters]);

    // Sync from external filter changes
    useEffect(() => {
        setLocalYearFrom(filters.yearFrom ? new Date(filters.yearFrom).getFullYear() : '');
        setLocalYearTo(filters.yearTo ? new Date(filters.yearTo).getFullYear() : '');
        setLocalMinValue(filters.minContractValue !== undefined ? String(filters.minContractValue) : '');
    }, [filters]);

    return (
        <AppBar position="static" color="default" elevation={1} sx={{background: '#1a1a2e'}}>
            <Toolbar variant="dense" sx={{gap: 1.5, flexWrap: 'wrap', py: 0.5}}>
                <Typography variant="h6" sx={{fontWeight: 700, color: '#e0e0e0', mr: 1, fontSize: '1rem'}}>
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
                            sx={{background: '#0d0d1a', borderRadius: 1}}
                        />
                    )}
                    sx={{width: 260}}
                    noOptionsText="No matches"
                    size="small"
                />

                {/* Year From */}
                <FormControl size="small" sx={{minWidth: 110}}>
                    <InputLabel sx={{fontSize: '0.75rem'}}>Year from</InputLabel>
                    <Select
                        label="Year from"
                        value={localYearFrom}
                        onChange={(e) => setLocalYearFrom(e.target.value as number | '')}
                        SelectDisplayProps={{'data-testid': 'filter-year-from'} as React.HTMLAttributes<HTMLDivElement>}
                        size="small"
                    >
                        <MenuItem value="">
                            <em>Any</em>
                        </MenuItem>
                        {YEAR_OPTIONS.map((y) => (
                            <MenuItem key={y} value={y}>
                                {y}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Year To */}
                <FormControl size="small" sx={{minWidth: 110}}>
                    <InputLabel sx={{fontSize: '0.75rem'}}>Year to</InputLabel>
                    <Select
                        label="Year to"
                        value={localYearTo}
                        onChange={(e) => setLocalYearTo(e.target.value as number | '')}
                        SelectDisplayProps={{'data-testid': 'filter-year-to'} as React.HTMLAttributes<HTMLDivElement>}
                        size="small"
                    >
                        <MenuItem value="">
                            <em>Any</em>
                        </MenuItem>
                        {YEAR_OPTIONS.map((y) => (
                            <MenuItem key={y} value={y}>
                                {y}
                            </MenuItem>
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
                    slotProps={{input: {inputProps: {'data-testid': 'filter-min-value', min: 0}}}}
                    sx={{width: 140, background: '#0d0d1a', borderRadius: 1}}
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

                <Box sx={{flexGrow: 1}} />

                {/* Balance Graph — re-layout all nodes with fCOSE */}
                {onBalanceGraph && elements.nodes.length > 0 && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<HubIcon />}
                        onClick={onBalanceGraph}
                        data-testid="balance-graph"
                        sx={{color: '#90caf9', borderColor: '#90caf9'}}
                    >
                        Balance
                    </Button>
                )}

                {/* View mode toggle */}
                <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeToggle} size="small" sx={{ml: 1}}>
                    <ToggleButton
                        value="graph"
                        data-testid="view-mode-graph"
                        sx={{color: '#e0e0e0', borderColor: '#555'}}
                    >
                        <AccountTreeIcon fontSize="small" sx={{mr: 0.5}} />
                        Graph
                    </ToggleButton>
                    <ToggleButton
                        value="table"
                        data-testid="view-mode-table"
                        sx={{color: '#e0e0e0', borderColor: '#555'}}
                    >
                        <TableChartIcon fontSize="small" sx={{mr: 0.5}} />
                        Table
                    </ToggleButton>
                </ToggleButtonGroup>
            </Toolbar>
        </AppBar>
    );
}
