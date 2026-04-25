'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Autocomplete,
    Box,
    Button,
    TextField,
    Toolbar,
    AppBar,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HubIcon from '@mui/icons-material/Hub';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type {GraphNodeData, GraphElements} from '@/types/graph';
import type {FilterState} from '../types';
import {useHashRouter} from '@/hooks/useHashRouter';

export interface GraphToolbarProps {
    elements: GraphElements;
    filters: FilterState;
    viewMode?: 'graph' | 'table';
    onApplyFilters: (filters: FilterState) => void;
    onNodeSelect: (nodeId: string, data: GraphNodeData) => void;
    onBalanceGraph?: () => void;
}

function buildFilters(dateFrom: Dayjs | null, dateTo: Dayjs | null, minVal: string): FilterState {
    const f: FilterState = {};
    if (dateFrom?.isValid()) f.yearFrom = dateFrom.format('YYYY-MM-DD');
    if (dateTo?.isValid()) f.yearTo = dateTo.format('YYYY-MM-DD');
    if (minVal !== '') f.minContractValue = Number(minVal);
    return f;
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

    const now = dayjs();
    const defaultDateFrom = now.startOf('year');
    const defaultDateTo = now;

    const [dateFrom, setDateFrom] = useState<Dayjs | null>(
        filters.yearFrom ? dayjs(filters.yearFrom) : defaultDateFrom,
    );
    const [dateTo, setDateTo] = useState<Dayjs | null>(
        filters.yearTo ? dayjs(filters.yearTo) : defaultDateTo,
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

    const isNonDefault =
        (dateFrom !== null && !dateFrom.isSame(defaultDateFrom, 'day')) ||
        (dateTo !== null && !dateTo.isSame(defaultDateTo, 'day')) ||
        localMinValue !== '';

    const nodeOptions = useMemo(
        () =>
            elements.nodes
                .filter((n) => n.data.expanded !== false || n.data.type !== 'Person')
                .map((n) => ({id: n.data.id, label: n.data.label ?? n.data.id})),
        [elements.nodes],
    );

    const handleDateFromAccept = useCallback(
        (newDate: Dayjs | null) => {
            setDateFrom(newDate);
            onApplyFilters(buildFilters(newDate, dateTo, localMinValue));
        },
        [dateTo, localMinValue, onApplyFilters],
    );

    const handleDateToAccept = useCallback(
        (newDate: Dayjs | null) => {
            setDateTo(newDate);
            onApplyFilters(buildFilters(dateFrom, newDate, localMinValue));
        },
        [dateFrom, localMinValue, onApplyFilters],
    );

    const handleMinValueCommit = useCallback(() => {
        onApplyFilters(buildFilters(dateFrom, dateTo, localMinValue));
    }, [dateFrom, dateTo, localMinValue, onApplyFilters]);

    const handleReset = useCallback(() => {
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
        setLocalMinValue('');
        onApplyFilters(buildFilters(defaultDateFrom, defaultDateTo, ''));
    }, [defaultDateFrom, defaultDateTo, onApplyFilters]);

    // Sync from external filter changes (e.g. URL-driven)
    useEffect(() => {
        setDateFrom(filters.yearFrom ? dayjs(filters.yearFrom) : defaultDateFrom);
        setDateTo(filters.yearTo ? dayjs(filters.yearTo) : defaultDateTo);
        setLocalMinValue(filters.minContractValue !== undefined ? String(filters.minContractValue) : '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar variant="dense" sx={{gap: 1.5, flexWrap: 'wrap', py: 0.5}}>
                <Typography variant="h6" sx={{fontWeight: 700, mr: 1, fontSize: '1rem'}}>
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
                        />
                    )}
                    sx={{width: 260}}
                    noOptionsText="No matches"
                    size="small"
                />

                {/* Date From */}
                <Box data-testid="filter-date-from">
                    <DatePicker
                        label="Date from"
                        value={dateFrom}
                        onChange={setDateFrom}
                        onAccept={handleDateFromAccept}
                        slotProps={{textField: {size: 'small', sx: {width: 150}}}}
                    />
                </Box>

                {/* Date To */}
                <Box data-testid="filter-date-to">
                    <DatePicker
                        label="Date to"
                        value={dateTo}
                        onChange={setDateTo}
                        onAccept={handleDateToAccept}
                        slotProps={{textField: {size: 'small', sx: {width: 150}}}}
                    />
                </Box>

                {/* Min contract value */}
                <TextField
                    label="Min value (EUR)"
                    value={localMinValue}
                    onChange={(e) => setLocalMinValue(e.target.value)}
                    onBlur={handleMinValueCommit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleMinValueCommit();
                    }}
                    size="small"
                    type="number"
                    slotProps={{input: {inputProps: {'data-testid': 'filter-min-value', min: 0}}}}
                    sx={{width: 140}}
                />

                {/* Apply — for min value convenience */}
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<FilterListIcon />}
                    onClick={handleMinValueCommit}
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
                    >
                        Balance
                    </Button>
                )}

                {/* View mode toggle */}
                <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeToggle} size="small" sx={{ml: 1}}>
                    <ToggleButton value="graph" data-testid="view-mode-graph">
                        <AccountTreeIcon fontSize="small" sx={{mr: 0.5}} />
                        Graph
                    </ToggleButton>
                    <ToggleButton value="table" data-testid="view-mode-table">
                        <TableChartIcon fontSize="small" sx={{mr: 0.5}} />
                        Table
                    </ToggleButton>
                </ToggleButtonGroup>
            </Toolbar>
        </AppBar>
    );
}
