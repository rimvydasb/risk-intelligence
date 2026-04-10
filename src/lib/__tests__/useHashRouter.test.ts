import { renderHook, act } from '@testing-library/react';
import { useHashRouter, parseRoute } from '../useHashRouter';

// jsdom sets window.location.hash to '' by default
beforeEach(() => {
    window.location.hash = '';
});

describe('useHashRouter', () => {
    it('returns "/" when hash is empty', () => {
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/');
    });

    it('returns "/" when hash is "#"', () => {
        window.location.hash = '#';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/');
    });

    it('returns "/" when hash is "#/"', () => {
        window.location.hash = '#/';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/');
    });

    it('parses "/entities/110053842" from hash "#/entities/110053842"', () => {
        window.location.hash = '#/entities/110053842';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/entities/110053842');
    });

    it('navigate() sets window.location.hash with leading #', () => {
        const { result } = renderHook(() => useHashRouter());
        act(() => {
            result.current.navigate('/entities/456');
        });
        expect(window.location.hash).toBe('#/entities/456');
    });

    it('navigate() normalizes path that is missing leading slash', () => {
        const { result } = renderHook(() => useHashRouter());
        act(() => {
            result.current.navigate('entities/789');
        });
        expect(window.location.hash).toBe('#/entities/789');
    });

    it('updates route when hashchange event fires', () => {
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/');

        act(() => {
            window.location.hash = '#/entities/999';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
        expect(result.current.route).toBe('/entities/999');
    });

    it('reverts to "/" when hash is cleared', () => {
        window.location.hash = '#/entities/111';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/entities/111');

        act(() => {
            window.location.hash = '';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
        expect(result.current.route).toBe('/');
    });
});

describe('parseRoute', () => {
    it('returns { view: "graph" } for "/"', () => {
        expect(parseRoute('/')).toEqual({ view: 'graph' });
    });

    it('returns { view: "graph" } for unknown paths', () => {
        expect(parseRoute('/unknown/path')).toEqual({ view: 'graph' });
    });

    it('returns { view: "entity", id: "110053842" } for "/entities/110053842"', () => {
        expect(parseRoute('/entities/110053842')).toEqual({ view: 'entity', id: '110053842' });
    });

    it('does not match nested entity paths', () => {
        expect(parseRoute('/entities/123/contracts')).toEqual({ view: 'graph' });
    });
});
