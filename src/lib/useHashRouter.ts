import { useEffect, useState } from 'react';

function splitHash(raw: string): { path: string; search: string } {
    // hash format: #/path?key=val or #/path (no query)
    const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw;
    const qIdx = withoutHash.indexOf('?');
    if (qIdx === -1) return { path: withoutHash, search: '' };
    return { path: withoutHash.slice(0, qIdx), search: withoutHash.slice(qIdx) };
}

function getHashRoute(): string {
    if (typeof window === 'undefined') return '/';
    const { path } = splitHash(window.location.hash);
    if (!path || path === '/') return '/';
    return path;
}

function getHashQueryParams(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const { search } = splitHash(window.location.hash);
    if (!search) return {};
    return Object.fromEntries(new URLSearchParams(search));
}

function buildHash(path: string, params: Record<string, string | number>): string {
    const filtered = Object.entries(params).filter(([, v]) => v !== '' && v != null);
    const qs = filtered.length > 0 ? '?' + new URLSearchParams(
        Object.fromEntries(filtered.map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return path + qs;
}

export interface HashRouter {
    route: string;
    navigate: (path: string) => void;
    queryParams: Record<string, string>;
    setQueryParams: (params: Record<string, string | number>) => void;
}

export function useHashRouter(): HashRouter {
    const [route, setRoute] = useState<string>(getHashRoute);
    const [queryParams, setQueryParamsState] = useState<Record<string, string>>(getHashQueryParams);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(getHashRoute());
            setQueryParamsState(getHashQueryParams());
        };
        window.addEventListener('hashchange', handleHashChange);
        // Sync on mount
        setRoute(getHashRoute());
        setQueryParamsState(getHashQueryParams());
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navigate = (path: string) => {
        const normalized = path.startsWith('/') ? path : '/' + path;
        // Preserve existing query params when navigating within the same route,
        // but clear them when navigating to a different route section.
        window.location.hash = normalized;
    };

    const setQueryParams = (params: Record<string, string | number>) => {
        const currentRoute = getHashRoute();
        window.location.hash = buildHash(currentRoute, params);
    };

    return { route, navigate, queryParams, setQueryParams };
}

/** Parse a route like "/entities/110053842" → { view: 'entity', id: '110053842' } */
export type ParsedRoute =
    | { view: 'graph' }
    | { view: 'entity'; id: string };

export function parseRoute(route: string): ParsedRoute {
    const entityMatch = route.match(/^\/entities\/([^/]+)$/);
    if (entityMatch) return { view: 'entity', id: entityMatch[1] };
    return { view: 'graph' };
}

/** Build a URL query string from filter params, omitting defaults */
export interface GraphFilterParams {
    yearFrom: number;
    yearTo: number;
    minValue: number;
}

export const FILTER_DEFAULTS: GraphFilterParams = {
    yearFrom: 2010,
    yearTo: new Date().getFullYear(),
    minValue: 0,
};

export function buildGraphUrl(base: string, filters: GraphFilterParams): string {
    const params = new URLSearchParams();
    if (filters.yearFrom !== FILTER_DEFAULTS.yearFrom) params.set('yearFrom', String(filters.yearFrom));
    if (filters.yearTo !== FILTER_DEFAULTS.yearTo) params.set('yearTo', String(filters.yearTo));
    if (filters.minValue !== FILTER_DEFAULTS.minValue) params.set('minValue', String(filters.minValue));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

export function activeFilterCount(filters: GraphFilterParams): number {
    let count = 0;
    if (filters.yearFrom !== FILTER_DEFAULTS.yearFrom) count++;
    if (filters.yearTo !== FILTER_DEFAULTS.yearTo) count++;
    if (filters.minValue !== FILTER_DEFAULTS.minValue) count++;
    return count;
}
