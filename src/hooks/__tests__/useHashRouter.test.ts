/**
 * @jest-environment jsdom
 */
import { useHashRouter } from '../useHashRouter';
import { renderHook, act } from '@testing-library/react';

describe('useHashRouter', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('returns "/" route when hash is empty', () => {
    const { result } = renderHook(() => useHashRouter());
    expect(result.current.route).toBe('/');
  });

  it('parses route from hash', () => {
    window.location.hash = '#/entities/org:123';
    const { result } = renderHook(() => useHashRouter());
    expect(result.current.route).toBe('/entities/org:123');
  });

  it('parses query params from hash', () => {
    window.location.hash = '#/?yearFrom=2022&yearTo=2023';
    const { result } = renderHook(() => useHashRouter());
    expect(result.current.params.get('yearFrom')).toBe('2022');
    expect(result.current.params.get('yearTo')).toBe('2023');
  });

  it('navigate updates hash and triggers re-render', async () => {
    const { result } = renderHook(() => useHashRouter());
    act(() => {
      result.current.navigate('/entities/org:abc');
    });
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.route).toBe('/entities/org:abc');
  });

  it('replace updates state without back-stack entry', () => {
    const spy = jest.spyOn(history, 'replaceState');
    const { result } = renderHook(() => useHashRouter());
    act(() => {
      result.current.replace('/', { yearFrom: '2022' });
    });
    expect(spy).toHaveBeenCalledWith(null, '', '#/?yearFrom=2022');
    spy.mockRestore();
  });
});
