'use client';

import {useCallback, useEffect, useState} from 'react';

function parseHash(hash: string): {route: string; params: URLSearchParams} {
    const raw = hash.replace(/^#/, '');
    const [pathPart, queryPart] = raw.split('?');
    const route = pathPart || '/';
    const params = new URLSearchParams(queryPart ?? '');
    return {route, params};
}

function buildHash(path: string, params?: Record<string, string>): string {
    const query = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    return '#' + path + query;
}

export interface HashRouter {
    route: string;
    params: URLSearchParams;
    navigate: (path: string, params?: Record<string, string>) => void;
    replace: (path: string, params?: Record<string, string>) => void;
}

export function useHashRouter(): HashRouter {
    const [hashState, setHashState] = useState<{route: string; params: URLSearchParams}>(() => {
        if (typeof window === 'undefined') {
            return {route: '/', params: new URLSearchParams()};
        }
        return parseHash(window.location.hash);
    });

    useEffect(() => {
        const handler = () => setHashState(parseHash(window.location.hash));
        window.addEventListener('hashchange', handler);
        handler();
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const navigate = useCallback((path: string, params?: Record<string, string>) => {
        window.location.hash = buildHash(path, params);
    }, []);

    const replace = useCallback((path: string, params?: Record<string, string>) => {
        history.replaceState(null, '', buildHash(path, params));
        setHashState(parseHash(window.location.hash));
    }, []);

    return {route: hashState.route, params: hashState.params, navigate, replace};
}
