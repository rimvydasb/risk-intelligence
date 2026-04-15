import {useQuery} from '@tanstack/react-query';
import type {HealthcheckResult} from '@/app/api/v1/healthcheck/route';

async function fetchHealthcheck(): Promise<HealthcheckResult> {
    const res = await fetch('/api/v1/healthcheck');
    return res.json() as Promise<HealthcheckResult>;
}

export function useHealthcheck() {
    return useQuery<HealthcheckResult>({
        queryKey: ['healthcheck'],
        queryFn: fetchHealthcheck,
        retry: 2,
        retryDelay: 1000,
        staleTime: 30 * 1000,
    });
}
