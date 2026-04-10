'use client';

import { useState } from 'react';
import { Container, TextField, List, ListItem, ListItemText, Paper, Typography, Box } from '@mui/material';
import Link from 'next/link';

export default function Dashboard() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length > 2) {
            const res = await fetch(`/api/search?q=${val}`);
            const data = await res.json();
            setResults(data);
        } else {
            setResults([]);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
            <Box textAlign="center" mb={4}>
                <Typography variant="h3" gutterBottom>Risk Intelligence</Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Lithuanian Public Procurement Fraud Detection (Local POC)
                </Typography>
            </Box>

            <TextField
                fullWidth
                label="Search Company or Jar Code"
                variant="outlined"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
            />

            {results.length > 0 && (
                <Paper sx={{ mt: 2 }}>
                    <List>
                        {results.map((company) => (
                            <ListItem 
                                key={company.jarKodas} 
                                component={Link} 
                                href={`/entities/${company.jarKodas}`}
                                sx={{ 
                                    textDecoration: 'none', 
                                    color: 'inherit',
                                    '&:hover': { bgcolor: 'action.hover' } 
                                }}
                            >
                                <ListItemText 
                                    primary={company.name} 
                                    secondary={`Code: ${company.jarKodas} | Risk: ${Math.round(company.displayScore)}`} 
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}
        </Container>
    );
}
