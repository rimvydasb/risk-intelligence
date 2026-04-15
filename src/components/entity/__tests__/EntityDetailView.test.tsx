/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {EntityDetailView} from '../EntityDetailView';

// Mock useHashRouter
jest.mock('@/hooks/useHashRouter', () => ({
    useHashRouter: () => ({navigate: jest.fn(), replace: jest.fn(), route: '/', params: new URLSearchParams()}),
}));

const MOCK_ENTITY = {
    id: 'org:110053842',
    type: 'PublicCompany',
    label: 'AB "Lietuvos geležinkeliai"',
    data: {employees: 122, avgSalary: 5023},
    relationships: [{type: 'Contract', targetId: 'org:304977594', targetLabel: 'AB LTG Cargo', label: '432M EUR'}],
};

function renderWithQuery(ui: React.ReactElement) {
    const qc = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('EntityDetailView', () => {
    beforeEach(() => jest.resetAllMocks());

    it('shows loading spinner initially', () => {
        global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
        renderWithQuery(<EntityDetailView entityId="org:110053842" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders entity label and type chip after load', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => MOCK_ENTITY,
        } as unknown as Response);

        renderWithQuery(<EntityDetailView entityId="org:110053842" />);
        await waitFor(() => expect(screen.getByText('AB "Lietuvos geležinkeliai"')).toBeInTheDocument());
        expect(screen.getByText('PublicCompany')).toBeInTheDocument();
    });

    it('renders "Risk Score" section', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => MOCK_ENTITY,
        } as unknown as Response);

        renderWithQuery(<EntityDetailView entityId="org:110053842" />);
        await waitFor(() => expect(screen.getByText('Risk Score')).toBeInTheDocument());
    });

    it('renders "Back to Graph" button', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => MOCK_ENTITY,
        } as unknown as Response);

        renderWithQuery(<EntityDetailView entityId="org:110053842" />);
        await waitFor(() => expect(screen.getByText('Back to Graph')).toBeInTheDocument());
    });

    it('renders relationships list', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => MOCK_ENTITY,
        } as unknown as Response);

        renderWithQuery(<EntityDetailView entityId="org:110053842" />);
        await waitFor(() => expect(screen.getByText('AB LTG Cargo')).toBeInTheDocument());
    });

    it('shows error alert on fetch failure', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({error: 'Entity not found'}),
        } as unknown as Response);

        renderWithQuery(<EntityDetailView entityId="org:unknown" />);
        await waitFor(() => expect(screen.getByText('Entity not found')).toBeInTheDocument());
    });
});
