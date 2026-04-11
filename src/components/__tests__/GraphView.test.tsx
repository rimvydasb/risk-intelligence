
import {render, screen} from '@testing-library/react';
import GraphView from '../GraphView';

// Cytoscape requires a real DOM with layout dimensions; mock it for unit tests.
jest.mock('cytoscape', () => {
    return {
        __esModule: true,
        default: jest.fn(() => ({
            destroy: jest.fn(),
        })),
    };
});

describe('GraphView', () => {
    it('renders the graph container', () => {
        render(<GraphView />);
        const container = screen.getByTestId('graph-container');
        expect(container).toBeInTheDocument();
    });

    it('accepts custom elements without crashing', () => {
        const elements = [
            {data: {id: 'node-1', label: 'Node 1'}},
            {data: {id: 'node-2', label: 'Node 2'}},
            {data: {id: 'edge-1', source: 'node-1', target: 'node-2'}},
        ];
        render(<GraphView elements={elements} />);
        expect(screen.getByTestId('graph-container')).toBeInTheDocument();
    });
});
