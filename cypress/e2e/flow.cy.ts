describe('Risk Intelligence POC Flow', () => {
    it('should search for a company, view profile, and expand network', () => {
        cy.visit('http://localhost:3000');
        
        // 1. Search
        cy.get('input[label="Search Company or Jar Code"]').type('Lietuvos');
        cy.contains('Akcinė bendrovė "Lietuvos geležinkeliai"').click();

        // 2. Profile View
        cy.url().should('include', '/entities/110053842');
        cy.contains('Risk Score').should('be.visible');
        cy.contains('Management & Ownership').should('be.visible');

        // 3. Network Expansion
        cy.contains('View Relationship Network').click();
        cy.get('[data-testid="graph-container"]').should('be.visible');
    });
});
