/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen, within} from '@testing-library/react';
import {GraphNodesTable} from '../GraphNodesTable';
import type {GraphNode} from '@/types/graph';

const nodes: GraphNode[] = [
    {
        data: {
            id: 'org:123',
            label: 'Acme Ltd',
            type: 'PrivateCompany',
            expanded: true,
            fromDate: '2010-01-01',
            tillDate: '2020-12-31',
        },
    },
    {
        data: {
            id: 'person:abc',
            label: 'Jonas Jonaitis',
            type: 'Person',
            expanded: false,
            fromDate: null,
            tillDate: null,
        },
    },
];

describe('GraphNodesTable', () => {
    it('renders table with data-testid', () => {
        render(<GraphNodesTable nodes={nodes} />);
        expect(screen.getByTestId('graph-nodes-table')).toBeInTheDocument();
    });

    it('renders one row per node', () => {
        render(<GraphNodesTable nodes={nodes} />);
        const rows = screen.getAllByTestId('node-id');
        expect(rows).toHaveLength(2);
    });

    it('displays id and label', () => {
        render(<GraphNodesTable nodes={nodes} />);
        const ids = screen.getAllByTestId('node-id');
        expect(ids[0]).toHaveTextContent('org:123');
        const labels = screen.getAllByTestId('node-label');
        expect(labels[0]).toHaveTextContent('Acme Ltd');
    });

    it('formats expanded as yes/no/—', () => {
        render(<GraphNodesTable nodes={nodes} />);
        const expanded = screen.getAllByTestId('node-expanded');
        expect(expanded[0]).toHaveTextContent('yes');
        expect(expanded[1]).toHaveTextContent('no');
    });

    it('formats fromDate and tillDate', () => {
        render(<GraphNodesTable nodes={nodes} />);
        const from = screen.getAllByTestId('node-from');
        expect(from[0]).toHaveTextContent('2010-01-01');
        expect(from[1]).toHaveTextContent('—');

        const till = screen.getAllByTestId('node-till');
        expect(till[0]).toHaveTextContent('2020-12-31');
        // null tillDate means "present"
        expect(till[1]).toHaveTextContent('present');
    });

    it('renders empty table with no rows', () => {
        render(<GraphNodesTable nodes={[]} />);
        expect(screen.getByTestId('graph-nodes-table')).toBeInTheDocument();
        expect(screen.queryByTestId('node-id')).toBeNull();
    });
});
