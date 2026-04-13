import { useQuery } from '@tanstack/react-query';
import type { CytoscapeElements } from '@/types/graph';

export interface ExpandOrgFilters {
  year?: number;
  minContractValue?: number;
}

export interface ExpandOrgResult {
  elements: CytoscapeElements;
  meta: {
    anchorId: string;
    totalNodes: number;
    totalEdges: number;
    generatedAt: string;
    cached: boolean;
  };
}

async function fetchExpandOrg(
  jarKodas: string,
  filters: ExpandOrgFilters,
): Promise<ExpandOrgResult> {
  const params = new URLSearchParams();
  if (filters.year !== undefined) params.set('year', String(filters.year));
  if (filters.minContractValue !== undefined)
    params.set('minContractValue', String(filters.minContractValue));
  const query = params.toString() ? '?' + params.toString() : '';
  const res = await fetch(`/api/v1/graph/expand/${encodeURIComponent(jarKodas)}${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ExpandOrgResult>;
}

export function useExpandOrg(jarKodas: string, filters: ExpandOrgFilters = {}) {
  return useQuery({
    queryKey: ['expandOrg', jarKodas, filters],
    queryFn: () => fetchExpandOrg(jarKodas, filters),
    enabled: !!jarKodas,
    staleTime: 5 * 60 * 1000,
  });
}
