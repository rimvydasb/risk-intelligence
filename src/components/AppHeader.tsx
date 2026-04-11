'use client';

import { memo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
    AppBar,
    Autocomplete,
    Badge,
    Button,
    CircularProgress,
    IconButton,
    MenuItem,
    Select,
    Stack,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import type { GraphFilterParams } from '@/lib/useHashRouter';

export interface SearchResultOption {
    jarKodas?: string;
    uid?: string;
    name?: string;
    fullName?: string;
}

interface AppHeaderProps {
    searchResults: SearchResultOption[];
    loading: boolean;
    pendingFilters: GraphFilterParams;
    filterBadgeCount: number;
    yearOptions: number[];
    onSearchInputChange: (value: string) => void;
    onSearchSelect: (option: SearchResultOption | null) => void;
    onYearFromChange: (value: number) => void;
    onYearToChange: (value: number) => void;
    onMinValueChange: (value: number) => void;
    onApplyFilters: () => void;
    onResetFilters: () => void;
}

function AppHeaderComponent({
    searchResults,
    loading,
    pendingFilters,
    filterBadgeCount,
    yearOptions,
    onSearchInputChange,
    onSearchSelect,
    onYearFromChange,
    onYearToChange,
    onMinValueChange,
    onApplyFilters,
    onResetFilters,
}: AppHeaderProps) {
    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                bgcolor: 'rgba(255,255,255,0.9)',
                color: 'text.primary',
            }}
        >
            <Toolbar>
                <Typography
                    variant="h6"
                    noWrap
                    component="div"
                    sx={{ mr: 4, fontWeight: 'bold', color: 'primary.main' }}
                >
                    RISK INTEL
                </Typography>
                <Autocomplete<SearchResultOption, false, false, true>
                    freeSolo
                    filterOptions={(options) => options}
                    sx={{ width: 400 }}
                    options={searchResults}
                    getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || option.fullName || '')}
                    onInputChange={(_, value) => onSearchInputChange(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            placeholder="Search Company or Person..."
                            slotProps={{
                                ...params.slotProps,
                                input: {
                                    ...params.slotProps?.input,
                                    startAdornment: (
                                        <>
                                            <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                            {params.slotProps?.input?.startAdornment}
                                        </>
                                    ),
                                    endAdornment: (
                                        <>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.slotProps?.input?.endAdornment}
                                        </>
                                    ),
                                },
                            }}
                        />
                    )}
                    onChange={(_, value) => {
                        if (value && typeof value !== 'string') {
                            onSearchSelect(value);
                        }
                    }}
                />

                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', ml: 2 }}>
                    <Tooltip title="Year From">
                        <Select
                            size="small"
                            value={pendingFilters.yearFrom}
                            onChange={(event) => onYearFromChange(Number(event.target.value))}
                            sx={{ minWidth: 90, fontSize: 13 }}
                            inputProps={{ 'aria-label': 'Year From', 'data-testid': 'filter-year-from' }}
                        >
                            {yearOptions.map((year) => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary">–</Typography>
                    <Tooltip title="Year To">
                        <Select
                            size="small"
                            value={pendingFilters.yearTo}
                            onChange={(event) => onYearToChange(Number(event.target.value))}
                            sx={{ minWidth: 90, fontSize: 13 }}
                            inputProps={{ 'aria-label': 'Year To', 'data-testid': 'filter-year-to' }}
                        >
                            {yearOptions.map((year) => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </Tooltip>
                    <Tooltip title="Minimum contract value (EUR)">
                        <TextField
                            size="small"
                            type="number"
                            label="Min €"
                            value={pendingFilters.minValue === 0 ? '' : pendingFilters.minValue}
                            onChange={(event) => onMinValueChange(Number(event.target.value) || 0)}
                            sx={{ width: 110 }}
                            slotProps={{ htmlInput: { min: 0, step: 10000, 'data-testid': 'filter-min-value' } }}
                        />
                    </Tooltip>
                    <Badge badgeContent={filterBadgeCount} color="primary">
                        <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            startIcon={<FilterListIcon />}
                            onClick={onApplyFilters}
                            data-testid="filter-apply"
                        >
                            Apply
                        </Button>
                    </Badge>
                    {filterBadgeCount > 0 && (
                        <Tooltip title="Reset filters">
                            <IconButton
                                size="small"
                                onClick={onResetFilters}
                                data-testid="filter-reset"
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Toolbar>
        </AppBar>
    );
}

const AppHeader = memo(AppHeaderComponent);
AppHeader.displayName = 'AppHeader';

export default AppHeader;
