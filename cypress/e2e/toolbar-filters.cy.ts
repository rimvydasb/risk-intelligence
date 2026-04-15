describe('Toolbar Filters', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('[data-testid="graph-container"]', {timeout: 15000}).should('be.visible');
    });

    it('renders filter controls in the toolbar', () => {
        cy.get('[data-testid="filter-year-from"]').should('exist');
        cy.get('[data-testid="filter-year-to"]').should('exist');
        cy.get('[data-testid="filter-min-value"]').should('exist');
        cy.get('[data-testid="filter-apply"]').should('be.visible');
    });

    it('Apply button is visible with no badge when using defaults', () => {
        cy.get('[data-testid="filter-apply"]').should('be.visible');
        // Badge should not be present when defaults are applied
        cy.get('[data-testid="filter-reset"]').should('not.exist');
    });

    it('shows reset button after applying non-default filters', () => {
        // Set minValue to something non-default
        cy.get('[data-testid="filter-min-value"]').clear().type('100000');
        cy.get('[data-testid="filter-apply"]').click();
        // Reset button should appear because a non-default filter is active
        cy.get('[data-testid="filter-reset"]').should('exist');
    });

    it('reset button clears filters and removes itself', () => {
        cy.get('[data-testid="filter-min-value"]').clear().type('100000');
        cy.get('[data-testid="filter-apply"]').click();
        cy.get('[data-testid="filter-reset"]').click();
        cy.get('[data-testid="filter-reset"]').should('not.exist');
        cy.get('[data-testid="filter-min-value"]').should('have.value', '');
    });

    it('reflects applied year filter in URL hash query string', () => {
        // Select a narrow year range
        cy.get('[data-testid="filter-year-from"]').parent().click();
        cy.contains('[role="option"]', '2022').click();
        cy.get('[data-testid="filter-year-to"]').parent().click();
        cy.contains('[role="option"]', '2022').click();
        cy.get('[data-testid="filter-apply"]').click();
        cy.url().should('include', 'yearFrom=2022');
        cy.url().should('include', 'yearTo=2022');
    });
});
