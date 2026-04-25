describe('Toolbar Filters', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('[data-testid="graph-container"]', {timeout: 15000}).should('be.visible');
    });

    it('renders filter controls in the toolbar', () => {
        cy.get('[data-testid="filter-date-from"]').should('exist');
        cy.get('[data-testid="filter-date-to"]').should('exist');
        cy.get('[data-testid="filter-min-value"]').should('exist');
        cy.get('[data-testid="filter-apply"]').should('be.visible');
    });

    it('Apply button is visible with no badge when using defaults', () => {
        cy.get('[data-testid="filter-apply"]').should('be.visible');
        // Reset button should not be present when defaults are applied
        cy.get('[data-testid="filter-reset"]').should('not.exist');
    });

    it('shows reset button after applying non-default filters', () => {
        cy.get('[data-testid="filter-min-value"]').clear().type('100000');
        cy.get('[data-testid="filter-apply"]').click();
        cy.get('[data-testid="filter-reset"]').should('exist');
    });

    it('reset button clears filters and removes itself', () => {
        cy.get('[data-testid="filter-min-value"]').clear().type('100000');
        cy.get('[data-testid="filter-apply"]').click();
        cy.get('[data-testid="filter-reset"]').click();
        cy.get('[data-testid="filter-reset"]').should('not.exist');
        cy.get('[data-testid="filter-min-value"]').should('have.value', '');
    });

    it('reflects applied date filter in URL hash query string', () => {
        // onAccept auto-applies and updates URL as soon as date is fully entered
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').click();
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').realType('01012022');
        cy.url().should('include', 'yearFrom=2022-01-01');
    });
});

