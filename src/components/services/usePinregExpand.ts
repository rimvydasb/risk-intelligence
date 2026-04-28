import {useQuery} from '@tanstack/react-query';
import type {GraphElements} from '@/types/graph';

interface PinregExpandResult {
    elements: GraphElements;
}

async function fetchPinregExpand(vardas: string, personId: string): Promise<PinregExpandResult> {
    const res = await fetch('/api/v1/person/pinreg', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({vardas, personId}),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<PinregExpandResult>;
}

/**
 * Fetches and caches pinreg (interest declarations) for a person node.
 * Only fires when both vardas and a valid personId are provided.
 */
export function usePinregExpand(vardas: string | null, personId: string | null) {
    return useQuery({
        queryKey: ['pinregExpand', personId],
        queryFn: () => fetchPinregExpand(vardas!, personId!),
        enabled: !!vardas && !!personId && personId.startsWith('person:'),
        staleTime: 24 * 60 * 60 * 1000,
    });
}
