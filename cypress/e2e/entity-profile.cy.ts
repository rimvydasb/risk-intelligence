describe('Entity Profile — Hash Navigation', () => {
    it('deep-links directly to entity detail via hash URL', () => {
        Cypress.on('uncaught:exception', () => false);

        cy.visit('http://localhost:3000/#/entities/110053842');

        // Entity detail view should render without a page reload
        cy.contains('Lietuvos geležinkeliai', { timeout: 10000 }).should('be.visible');
        cy.contains('Risk Score').should('be.visible');
        cy.contains('Back to Graph').should('be.visible');
    });

    it('navigates from graph sidebar to entity detail and back without reload', () => {
        Cypress.on('uncaught:exception', () => false);

        cy.visit('http://localhost:3000');

        // Graph must be visible first
        cy.get('[data-testid="graph-container"]').should('be.visible');

        // Search and open sidebar
        cy.get('input[placeholder="Search Company or Person..."]').type('Lietuvos');
        cy.get('.MuiAutocomplete-option', { timeout: 10000 }).should('have.length.at.least', 1).first().click({ force: true });

        cy.contains('Node Details').should('be.visible');

        // Click "View Full Profile" — should switch to entity detail via hash
        cy.contains('View Full Profile').click();

        // URL hash should now be #/entities/...
        cy.location('hash').should('match', /^#\/entities\//);

        // Entity detail content rendered
        cy.contains('Risk Score', { timeout: 10000 }).should('be.visible');
        cy.contains('Back to Graph').should('be.visible');

        // Click back — hash should return to /
        cy.contains('Back to Graph').click();
        cy.location('hash').should('satisfy', (h: string) => h === '' || h === '#/' || h === '#');

        // Graph canvas should be visible again
        cy.get('[data-testid="graph-container"]').should('be.visible');
    });

    it('deep-links with prefixed entity id from sidebar flow', () => {
        Cypress.on('uncaught:exception', () => false);

        // The sidebar produces org:-prefixed IDs; verify deep-linking with that format works too
        cy.visit('http://localhost:3000/#/entities/org:110053842');

        // Entity detail view should render
        cy.location('hash', { timeout: 10000 }).should('include', 'entities');
        cy.contains('Lietuvos geležinkeliai', { timeout: 10000 }).should('be.visible');
    });
});
