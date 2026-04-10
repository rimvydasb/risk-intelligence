'use client';

import { useEffect, useState, use } from 'react';
import { Container, Typography, Paper, Grid, Divider, Box, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import GraphView from '@/components/GraphView';

export default function EntityProfile({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [company, setCompany] = useState<any>(null);
    const [showGraph, setShowGraph] = useState(false);
    const [graphElements, setGraphElements] = useState<any[]>([]);

    useEffect(() => {
        fetch(`/api/entities/${id}`)
            .then(res => res.json())
            .then(data => setCompany(data));
    }, [id]);

    const handleViewNetwork = async () => {
        const res = await fetch(`/api/entities/${id}/network`);
        const connections = await res.json();
        
        // Convert connections to Cytoscape elements
        const elements: any[] = [];
        const seenNodes = new Set();

        // Add start company
        elements.push({ data: { id: company.jarKodas, label: company.name } });
        seenNodes.add(company.jarKodas);

        connections.forEach((rel: any) => {
            if (!seenNodes.has(rel.personId)) {
                elements.push({ data: { id: rel.personId, label: 'Person' } });
                seenNodes.add(rel.personId);
            }
            if (!seenNodes.has(rel.companyId)) {
                elements.push({ data: { id: rel.companyId, label: 'Related Co' } });
                seenNodes.add(rel.companyId);
            }
            elements.push({ 
                data: { 
                    id: `e-${rel.personId}-${rel.companyId}`, 
                    source: rel.personId, 
                    target: rel.companyId,
                    label: rel.role 
                } 
            });
        });

        setGraphElements(elements);
        setShowGraph(true);
    };

    if (!company) return <Container sx={{ mt: 8 }}><Typography>Loading...</Typography></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4">{company.name}</Typography>
                    <Typography color="text.secondary">Jar Code: {company.jarKodas}</Typography>
                </Box>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: company.displayScore > 150 ? 'error.light' : 'success.light' }}>
                    <Typography variant="h6">Risk Score</Typography>
                    <Typography variant="h4">{Math.round(company.displayScore)}</Typography>
                </Paper>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Management & Ownership</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {company.relationships.map((rel: any) => (
                            <Box key={rel.id} sx={{ mb: 1 }}>
                                <Typography variant="subtitle1">{rel.person.fullName}</Typography>
                                <Typography variant="body2" color="text.secondary">{rel.role}</Typography>
                            </Box>
                        ))}
                        <Button variant="contained" sx={{ mt: 2 }} onClick={handleViewNetwork}>
                            View Relationship Network
                        </Button>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Recent Contracts</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell align="right">Value (EUR)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {company.contracts.map((c: any) => (
                                    <TableRow key={c.contractId}>
                                        <TableCell>{c.title}</TableCell>
                                        <TableCell align="right">{c.value.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                {showGraph && (
                    <Grid size={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6">Network Topology</Typography>
                            <GraphView elements={graphElements} />
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
}
