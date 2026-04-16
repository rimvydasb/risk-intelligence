/**
 * @jest-environment jsdom
 */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {NodeSidebar} from '../NodeSidebar';
import type {GraphNodeData} from '@/types/graph';

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

    it('renders Risk Profile section', () => {
        render(
            <NodeSidebar
                nodeId="org:110053842"
                nodeData={mockNodeData}
                onClose={jest.fn()}
                onViewFullProfile={jest.fn()}
            />,
        );
        expect(screen.getByText('Risk Profile')).toBeInTheDocument();
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
