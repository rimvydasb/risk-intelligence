import { useQuery } from '@tanstack/react-query';

export interface EntityDetailResult {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  relationships?: Array<{
    type: string;
    targetId: string;
    targetLabel: string;
    label?: string;
    fromDate?: string;
    tillDate?: string;
  }>;
}

async function fetchEntityDetail(entityId: string): Promise<EntityDetailResult> {
  const res = await fetch(`/api/v1/entity/${encodeURIComponent(entityId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<EntityDetailResult>;
}

export function useEntityDetail(entityId: string) {
  return useQuery({
    queryKey: ['entityDetail', entityId],
    queryFn: () => fetchEntityDetail(entityId),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000,
  });
}
