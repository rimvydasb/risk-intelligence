/**
 * @jest-environment jsdom
 */
import {renderHook, waitFor} from '@testing-library/react';
import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useEntityDetail} from '../useEntityDetail';

function makeWrapper() {
    const qc = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return ({children}: {children: React.ReactNode}) =>
        React.createElement(QueryClientProvider, {client: qc}, children);
}

const mockEntity = {
    id: 'org:110053842',
    type: 'PublicCompany',
    label: 'AB "Lietuvos geležinkeliai"',
    data: {employees: 122},
};

describe('useEntityDetail', () => {
    beforeEach(() => jest.resetAllMocks());

    it('fetches entity detail', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => mockEntity,
        } as unknown as Response);

        const {result} = renderHook(() => useEntityDetail('org:110053842'), {
            wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.label).toBe('AB "Lietuvos geležinkeliai"');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/entity/org%3A110053842');
    });

    it('is disabled when entityId is empty', () => {
        global.fetch = jest.fn();
        const {result} = renderHook(() => useEntityDetail(''), {wrapper: makeWrapper()});
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('exposes 404 error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({error: 'not found'}),
        } as unknown as Response);

        const {result} = renderHook(() => useEntityDetail('org:unknown'), {
            wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect((result.current.error as Error).message).toBe('not found');
    });
});
