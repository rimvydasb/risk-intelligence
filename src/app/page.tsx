'use client';

import { useRef, useState } from 'react';
import { 
    Box, 
    AppBar, 
    Toolbar, 
    Typography, 
    TextField, 
    Autocomplete, 
    Drawer, 
    IconButton, 
    Divider,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import GraphView from '@/components/GraphView';

export default function GraphExplorer() {
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleSearch = async (val: string) => {
        abortControllerRef.current?.abort();

        if (val.length > 2) {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`, { signal: controller.signal });
                const data = await res.json();
                setSearchResults(data);
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleNodeClick = (nodeData: any) => {
        setSelectedNode(nodeData);
        setSidebarOpen(true);
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            {/* Top Bar Search */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(255, 255, 255, 0.9)', color: 'text.primary' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ mr: 4, fontWeight: 'bold', color: 'primary.main' }}>
                        RISK INTEL
                    </Typography>
                    
                    <Autocomplete
                        freeSolo
                        filterOptions={(x) => x}
                        sx={{ width: 400 }}
                        options={searchResults}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : (option.name || option.fullName || '')}
                        onInputChange={(_, value) => handleSearch(value)}
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
                                                {(params.slotProps?.input as any)?.startAdornment}
                                            </>
                                        ),
                                        endAdornment: (
                                            <>
                                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                                {(params.slotProps?.input as any)?.endAdornment}
                                            </>
                                        ),
                                    },
                                }}
                            />
                        )}
                        onChange={(_, value: any) => {
                            if (value && typeof value !== 'string') {
                                handleNodeClick({ 
                                    id: value.jarKodas || value.uid, 
                                    label: value.name || value.fullName, 
                                    type: value.jarKodas ? 'company' : 'person' 
                                });
                            }
                        }}
                    />
                </Toolbar>
            </AppBar>

            {/* Main Graph View */}
            <GraphView onNodeClick={handleNodeClick} />

            {/* Slide-out Sidebar */}
            <Drawer
                anchor="right"
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                sx={{
                    width: 400,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 400,
                        boxSizing: 'border-box',
                        mt: '64px',
                        height: 'calc(100% - 64px)',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" component="div">Entity Details</Typography>
                        <IconButton onClick={() => setSidebarOpen(false)} data-testid="close-sidebar">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Divider />
                    
                    {selectedNode && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" color="primary">{selectedNode.label}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                ID: {selectedNode.id} | Type: {selectedNode.type?.toUpperCase()}
                            </Typography>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="subtitle2">Risk Profile</Typography>
                                <Typography variant="h4" color={selectedNode.risk > 150 ? 'error.main' : 'warning.main'}>
                                    {Math.round(selectedNode.risk || 0)}
                                </Typography>
                                <Typography variant="caption">Biological Interaction Score</Typography>
                            </Box>

                            <List sx={{ mt: 2 }}>
                                <ListItem>
                                    <ListItemText primary="Status" secondary="Active / Verified" />
                                </ListItem>
                                <ListItem>
                                    <ListItemText primary="Jurisdiction" secondary="Lithuania (LT)" />
                                </ListItem>
                            </List>
                        </Box>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
}
