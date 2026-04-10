'use client';

import { use, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Legacy URL redirect: /entities/:id → /#/entities/:id
 *
 * Any bookmarked or linked /entities/:id URL is seamlessly redirected to the
 * hash-based SPA route so the graph state is preserved.
 */
export default function EntityRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    useEffect(() => {
        // Replace current history entry so the back-button goes to wherever
        // the user came from, not back to this redirect shell.
        window.location.replace(`/#/entities/${id}`);
    }, [id]);

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
}
