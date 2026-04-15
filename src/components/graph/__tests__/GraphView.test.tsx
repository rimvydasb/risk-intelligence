/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

// Mock SigmaCanvas (browser-only) and next/dynamic
jest.mock('next/dynamic', () => () => {
    const MockCanvas = ({elements}: {elements: unknown}) => (
        <div data-testid="graph-container" data-element-count={JSON.stringify(elements)} />
    );
    MockCanvas.displayName = 'MockSigmaCanvas';
    return MockCanvas;
});

const MOCK_HEALTH = {status: 'ok', database: true, stagingCounts: {asmuo: 1, sutartis: 0, pirkimas: 0}};

const MOCK_ELEMENTS = {
    nodes: [{data: {id: 'org:110053842', label: 'AB LG', type: 'PublicCompany', expanded: true}}],
    edges: [],
};

beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/healthcheck')) {
            return Promise.resolve({ok: true, json: async () => MOCK_HEALTH} as unknown as Response);
        }
        return Promise.resolve({
            ok: true,
            json: async () => ({
                elements: MOCK_ELEMENTS,
                meta: {anchorId: 'org:110053842', totalNodes: 1, totalEdges: 0, generatedAt: '', cached: false},
            }),
        } as unknown as Response);
    });
});

afterEach(() => jest.clearAllMocks());

function renderWithQuery(ui: React.ReactElement) {
    const qc = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// Import after mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {default: GraphView} = require('../GraphView');

describe('GraphView', () => {
    it('renders the graph container', async () => {
        renderWithQuery(<GraphView />);
        await waitFor(() => expect(screen.getByTestId('graph-container')).toBeInTheDocument());
    });

    it('renders toolbar with filter controls', async () => {
        renderWithQuery(<GraphView />);
        await waitFor(() => expect(screen.getByText('Risk Intelligence')).toBeInTheDocument());
        expect(screen.getByPlaceholderText('Search Company or Person...')).toBeInTheDocument();
    });

    it('Apply button triggers filter application', async () => {
        renderWithQuery(<GraphView />);
        const applyBtn = await screen.findByTestId('filter-apply');
        expect(applyBtn).toBeInTheDocument();
        fireEvent.click(applyBtn);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
