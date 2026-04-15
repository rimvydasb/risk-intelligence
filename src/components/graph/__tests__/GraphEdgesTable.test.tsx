/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {GraphEdgesTable} from '../GraphEdgesTable';
import type {CytoscapeEdge} from '@/types/graph';

const edges: CytoscapeEdge[] = [
    {
        data: {
            id: 'contract:1',
            source: 'org:buyer',
            target: 'org:supplier',
            type: 'Contract',
            label: 'Supplier',
            value: 1_500_000,
            fromDate: '2018-03-01',
            tillDate: '2019-03-01',
        },
    },
    {
        data: {
            id: 'emp:2',
            source: 'person:abc',
            target: 'org:123',
            type: 'Employment',
            label: 'Director',
            value: 45_000,
            fromDate: '2015-06-01',
            tillDate: null,
        },
    },
    {
        data: {
            id: 'emp:3',
            source: 'person:xyz',
            target: 'org:456',
            type: 'Employment',
            label: undefined,
            value: undefined,
            fromDate: null,
            tillDate: undefined,
        },
    },
];

describe('GraphEdgesTable', () => {
    it('renders table with data-testid', () => {
        render(<GraphEdgesTable edges={edges} />);
        expect(screen.getByTestId('graph-edges-table')).toBeInTheDocument();
    });

    it('renders one row per edge', () => {
        render(<GraphEdgesTable edges={edges} />);
        expect(screen.getAllByTestId('edge-id')).toHaveLength(3);
    });

    it('displays source and target', () => {
        render(<GraphEdgesTable edges={edges} />);
        const sources = screen.getAllByTestId('edge-source');
        expect(sources[0]).toHaveTextContent('org:buyer');
        const targets = screen.getAllByTestId('edge-target');
        expect(targets[0]).toHaveTextContent('org:supplier');
    });

    it('formats value >= 1M as €X.XM', () => {
        render(<GraphEdgesTable edges={edges} />);
        const values = screen.getAllByTestId('edge-value');
        expect(values[0]).toHaveTextContent('€1.5M');
    });

    it('formats value >= 1000 with locale separator', () => {
        render(<GraphEdgesTable edges={edges} />);
        const values = screen.getAllByTestId('edge-value');
        expect(values[1]).toHaveTextContent('€45');
    });

    it('shows — for missing value', () => {
        render(<GraphEdgesTable edges={edges} />);
        const values = screen.getAllByTestId('edge-value');
        expect(values[2]).toHaveTextContent('—');
    });

    it('shows — for missing label', () => {
        render(<GraphEdgesTable edges={edges} />);
        const labels = screen.getAllByTestId('edge-label');
        expect(labels[2]).toHaveTextContent('—');
    });

    it('shows present for null tillDate', () => {
        render(<GraphEdgesTable edges={edges} />);
        const till = screen.getAllByTestId('edge-till');
        expect(till[1]).toHaveTextContent('present');
    });

    it('shows — for missing fromDate', () => {
        render(<GraphEdgesTable edges={edges} />);
        const from = screen.getAllByTestId('edge-from');
        expect(from[2]).toHaveTextContent('—');
    });

    it('renders empty table with no rows', () => {
        render(<GraphEdgesTable edges={[]} />);
        expect(screen.getByTestId('graph-edges-table')).toBeInTheDocument();
        expect(screen.queryByTestId('edge-id')).toBeNull();
    });
});
