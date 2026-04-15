/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CytoscapeElements } from '@/types/graph';

const EMPTY_ELEMENTS: CytoscapeElements = { nodes: [], edges: [] };

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
let mockParams = new URLSearchParams();

jest.mock('@/hooks/useHashRouter', () => ({
  useHashRouter: () => ({
    route: '/',
    params: mockParams,
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

// Import after mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GraphToolbar } = require('../GraphToolbar');

const defaultProps = {
  elements: EMPTY_ELEMENTS,
  filters: {},
  onApplyFilters: jest.fn(),
  onNodeSelect: jest.fn(),
};

beforeEach(() => {
  mockParams = new URLSearchParams();
  jest.clearAllMocks();
});

describe('GraphToolbar — view mode toggle', () => {
  it('renders both toggle buttons', () => {
    render(<GraphToolbar {...defaultProps} />);
    expect(screen.getByTestId('view-mode-graph')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-table')).toBeInTheDocument();
  });

  it('clicking table toggle navigates to /table/', () => {
    render(<GraphToolbar {...defaultProps} viewMode="graph" />);
    fireEvent.click(screen.getByTestId('view-mode-table'));
    expect(mockNavigate).toHaveBeenCalledWith('/table/', undefined);
  });

  it('clicking graph toggle navigates to /graph/', () => {
    render(<GraphToolbar {...defaultProps} viewMode="table" />);
    fireEvent.click(screen.getByTestId('view-mode-graph'));
    expect(mockNavigate).toHaveBeenCalledWith('/graph/', undefined);
  });

  it('clicking the active mode does not navigate', () => {
    render(<GraphToolbar {...defaultProps} viewMode="graph" />);
    fireEvent.click(screen.getByTestId('view-mode-graph'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves filter params when toggling', () => {
    mockParams = new URLSearchParams('yearFrom=2022&minContractValue=100000');
    render(<GraphToolbar {...defaultProps} viewMode="graph" />);
    fireEvent.click(screen.getByTestId('view-mode-table'));
    expect(mockNavigate).toHaveBeenCalledWith('/table/', { yearFrom: '2022', minContractValue: '100000' });
  });
});

