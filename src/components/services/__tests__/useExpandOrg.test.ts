/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExpandOrg } from '../useExpandOrg';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockElements = {
  nodes: [{ data: { id: 'org:110053842', label: 'LG', type: 'PublicCompany', expanded: true } }],
  edges: [],
};

describe('useExpandOrg', () => {
  beforeEach(() => jest.resetAllMocks());

  it('fetches org expansion and returns elements', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: mockElements,
        meta: { anchorId: 'org:110053842', totalNodes: 1, totalEdges: 0, generatedAt: '', cached: false },
      }),
    } as unknown as Response);

    const { result } = renderHook(() => useExpandOrg('110053842', {}), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.elements.nodes).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/graph/expand/110053842');
  });

  it('appends filter query params', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: mockElements, meta: {} }),
    } as unknown as Response);

    const { result } = renderHook(
      () => useExpandOrg('110053842', { year: 2022, minContractValue: 5000 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/graph/expand/110053842?year=2022&minContractValue=5000',
    );
  });

  it('is disabled when jarKodas is empty', () => {
    global.fetch = jest.fn();
    const { result } = renderHook(() => useExpandOrg('', {}), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exposes error on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'upstream error' }),
    } as unknown as Response);

    const { result } = renderHook(() => useExpandOrg('110053842', {}), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('upstream error');
  });
});
