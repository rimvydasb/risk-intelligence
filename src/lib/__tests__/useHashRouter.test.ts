import { renderHook, act } from '@testing-library/react';
import { useHashRouter, parseRoute, buildGraphUrl, activeFilterCount, FILTER_DEFAULTS, type GraphFilterParams } from '../useHashRouter';

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

    it('strips query string from route', () => {
        window.location.hash = '#/?yearFrom=2020&yearTo=2024';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.route).toBe('/');
    });

    it('parses queryParams from hash', () => {
        window.location.hash = '#/?yearFrom=2020&minValue=50000';
        const { result } = renderHook(() => useHashRouter());
        expect(result.current.queryParams).toEqual({ yearFrom: '2020', minValue: '50000' });
    });

    it('navigate() sets window.location.hash with leading #', () => {
        const { result } = renderHook(() => useHashRouter());
        act(() => { result.current.navigate('/entities/456'); });
        expect(window.location.hash).toBe('#/entities/456');
    });

    it('navigate() normalizes path that is missing leading slash', () => {
        const { result } = renderHook(() => useHashRouter());
        act(() => { result.current.navigate('entities/789'); });
        expect(window.location.hash).toBe('#/entities/789');
    });

    it('setQueryParams() updates hash with current path + new params', () => {
        window.location.hash = '#/';
        const { result } = renderHook(() => useHashRouter());
        act(() => { result.current.setQueryParams({ yearFrom: 2020, yearTo: 2024 }); });
        expect(window.location.hash).toContain('yearFrom=2020');
        expect(window.location.hash).toContain('yearTo=2024');
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

describe('buildGraphUrl', () => {
    const defaults = FILTER_DEFAULTS;

    it('returns base URL when all params are default', () => {
        expect(buildGraphUrl('/api/entities/initial', defaults)).toBe('/api/entities/initial');
    });

    it('appends yearFrom when non-default', () => {
        const url = buildGraphUrl('/api/entities/initial', { ...defaults, yearFrom: 2020 });
        expect(url).toContain('yearFrom=2020');
        expect(url).not.toContain('yearTo=');
        expect(url).not.toContain('minValue=');
    });

    it('appends all non-default params', () => {
        const url = buildGraphUrl('/api/entities/initial', { yearFrom: 2018, yearTo: 2023, minValue: 50000 });
        expect(url).toContain('yearFrom=2018');
        expect(url).toContain('yearTo=2023');
        expect(url).toContain('minValue=50000');
    });
});

describe('activeFilterCount', () => {
    it('returns 0 for default filters', () => {
        expect(activeFilterCount(FILTER_DEFAULTS)).toBe(0);
    });

    it('returns 1 when only yearFrom differs', () => {
        expect(activeFilterCount({ ...FILTER_DEFAULTS, yearFrom: 2020 })).toBe(1);
    });

    it('returns 3 when all three differ', () => {
        expect(activeFilterCount({ yearFrom: 2018, yearTo: 2023, minValue: 10000 })).toBe(3);
    });
});
