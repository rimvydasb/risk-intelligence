describe('Risk Intelligence Biological UI Flow', () => {
    it('should load the initial graph and allow searching and viewing node details', () => {
        // Ignore uncaught exceptions from the application
        Cypress.on('uncaught:exception', (err, runnable) => {
            return false;
        });

        cy.visit('http://localhost:3000');
        
        // 1. Initial Graph should be visible
        cy.get('[data-testid="graph-container"]').should('be.visible');

        // 2. Search via Top Bar
        cy.get('input[placeholder="Search Company or Person..."]').type('Lietuvos');
        
        // Wait for search results in the dropdown and click the first one
        cy.get('.MuiAutocomplete-option', { timeout: 10000 }).should('have.length.at.least', 1).first().click({ force: true });

        // 3. Sidebar should open
        cy.contains('Entity Details').should('be.visible');
        cy.contains('Lietuvos geležinkeliai').should('be.visible');
        cy.contains('Risk Profile').should('be.visible');

        // 4. Close Sidebar
        cy.get('[data-testid="close-sidebar"]').click();
        cy.contains('Entity Details').should('not.exist');
    });
});
