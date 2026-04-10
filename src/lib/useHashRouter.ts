import { useEffect, useState } from 'react';

function getHashRoute(): string {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#/') return '/';
    // Strip the leading '#'
    return hash.startsWith('#') ? hash.slice(1) : hash;
}

export interface HashRouter {
    route: string;
    navigate: (path: string) => void;
}

export function useHashRouter(): HashRouter {
    const [route, setRoute] = useState<string>(getHashRoute);

    useEffect(() => {
        const handleHashChange = () => setRoute(getHashRoute());
        window.addEventListener('hashchange', handleHashChange);
        // Sync on mount in case hash changed before the effect ran (e.g. SSR hydration)
        setRoute(getHashRoute());
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navigate = (path: string) => {
        const normalized = path.startsWith('/') ? path : '/' + path;
        window.location.hash = normalized;
    };

    return { route, navigate };
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
