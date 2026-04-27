/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {NodeSidebar} from '../NodeSidebar';
import type {GraphEdge, GraphNodeData} from '@/types/graph';

const mockNodeData: GraphNodeData = {
    id: 'org:110053842',
    label: 'AB "Lietuvos geležinkeliai"',
    type: 'PublicCompany',
    expanded: true,
    employees: 122,
    avgSalary: 5023,
    contractTotal: 432081948,
    contractCount: 79,
};

const mockEdges: GraphEdge[] = [
    {
        data: {
            id: 'edge:person:abc:org:110053842:Employment:abc',
            source: 'person:abc',
            target: 'org:110053842',
            type: 'Employment',
            label: 'Direktorius',
            fromDate: '2018-01-01',
            tillDate: null,
        },
    },
    {
        data: {
            id: 'edge:person:xyz:org:110053842:Employment:xyz',
            source: 'person:xyz',
            target: 'org:110053842',
            type: 'Employment',
            label: 'Buhalteris',
            fromDate: '2020-03-15',
            tillDate: '2023-12-31',
        },
    },
    {
        data: {
            id: 'edge:person:abc:person:spouse-abc:Spouse:abc',
            source: 'person:abc',
            target: 'person:spouse-abc',
            type: 'Spouse',
            label: 'Spouse',
            fromDate: '2010-06-01',
            tillDate: null,
        },
    },
];

describe('NodeSidebar', () => {
    it('does not render when nodeId is null', () => {
        const {container} = render(
            <NodeSidebar nodeId={null} nodeData={null} onClose={jest.fn()} onViewFullProfile={jest.fn()} />,
        );
        expect(container.querySelector('[data-testid="close-sidebar"]')).toBeNull();
    });

    it('renders "Node Details" heading when open', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('Node Details')).toBeInTheDocument();
    });

    it('renders entity label', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('AB "Lietuvos geležinkeliai"')).toBeInTheDocument();
    });

    it('renders "Relationships" heading', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('Relationships')).toBeInTheDocument();
    });

    it('shows "No relationships" when no edges provided', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                edges={[]}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('No relationships')).toBeInTheDocument();
    });

    it('groups edges by type with correct counts', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                edges={mockEdges}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('Employment (2)')).toBeInTheDocument();
        expect(screen.getByText('Spouse (1)')).toBeInTheDocument();
    });

    it('renders edge labels', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                edges={mockEdges}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('Direktorius')).toBeInTheDocument();
        expect(screen.getByText('Buhalteris')).toBeInTheDocument();
    });

    it('renders fromDate and tillDate for edges', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                edges={mockEdges}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText(/2020-03-15/)).toBeInTheDocument();
        expect(screen.getByText(/2023-12-31/)).toBeInTheDocument();
    });

    it('shows "present" when tillDate is null', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                edges={[mockEdges[0]]}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getAllByText(/present/).length).toBeGreaterThan(0);
    });

    it('calls onClose when close button clicked', () => {
        const onClose = jest.fn();
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={onClose}
                onViewFullProfile={jest.fn()}
            />,
        );
        fireEvent.click(screen.getByTestId('close-sidebar'));
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onViewFullProfile when "View Full Profile" clicked', () => {
        const onViewFullProfile = jest.fn();
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={jest.fn()}
                onViewFullProfile={onViewFullProfile}
            />,
        );
        fireEvent.click(screen.getByText('View Full Profile'));
        expect(onViewFullProfile).toHaveBeenCalledWith('org:110053842');
    });
});
