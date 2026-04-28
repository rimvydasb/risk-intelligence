describe('Risk Intelligence Biological UI Flow', () => {
    it('should load the initial graph and allow searching and viewing node details', () => {
        // Ignore uncaught exceptions from the application
        Cypress.on('uncaught:exception', (_err, _runnable) => {
            return false;
        });

        cy.visit('http://localhost:3000');

        // 1. Initial Graph should be visible
        cy.get('[data-testid="graph-container"]').should('be.visible');

        // 2. Search via Top Bar
        cy.get('input[placeholder="Search Company or Person..."]').type('Lietuvos');

        // Wait for search results in the dropdown and click the first one
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .should('have.length.at.least', 1)
            .first()
            .click({force: true});

        // 3. Sidebar should open
        cy.contains('Node Details').should('be.visible');
        cy.contains('Lietuvos geležinkeliai').should('be.visible');

        // 4. Close Sidebar
        cy.get('[data-testid="close-sidebar"]').click();
        cy.contains('Node Details').should('not.exist');
    });
});

describe('NodeSidebar relationship dates', () => {
    beforeEach(() => {
        Cypress.on('uncaught:exception', () => false);
    });

    it('Order and Delivery edges show real dates, not —', () => {
        cy.visit('http://localhost:3000');
        cy.get('[data-testid="graph-container"]', {timeout: 20000}).should('be.visible');

        // Open the sidebar for the anchor company via search
        cy.get('input[placeholder="Search Company or Person..."]').type('Lietuvos');
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .should('have.length.at.least', 1)
            .first()
            .click({force: true});

        cy.contains('Node Details').should('be.visible');

        // At least one Order or Delivery relationship group must be present
        cy.get('[data-testid="relationship-group-Order"], [data-testid="relationship-group-Delivery"]', {timeout: 10000})
            .should('have.length.at.least', 1);

        // Every edge-from-date inside Order/Delivery groups must show a real date (not —)
        cy.get('[data-testid="relationship-group-Order"] [data-testid="edge-from-date"], [data-testid="relationship-group-Delivery"] [data-testid="edge-from-date"]')
            .each(($el) => {
                expect($el.text()).not.to.equal('—');
            });
    });
});
