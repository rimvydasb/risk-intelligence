describe('Graph Data Table — view mode toggle', () => {
    beforeEach(() => {
        Cypress.on('uncaught:exception', () => false);
    });

    it('navigates directly to #/table/ and shows both tables', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', { timeout: 15000 }).should('be.visible');
        cy.get('[data-testid="graph-edges-table"]').should('be.visible');
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);
        cy.get('[data-testid="graph-edges-table"] tbody tr').should('have.length.at.least', 1);
    });

    it('navigates directly to #/graph/ and shows graph, not tables', () => {
        cy.visit('http://localhost:3000/#/graph/');
        cy.get('[data-testid="graph-container"]', { timeout: 15000 }).should('exist');
        cy.get('[data-testid="graph-nodes-table"]').should('not.exist');
        cy.get('[data-testid="graph-edges-table"]').should('not.exist');
    });

    it('clicking table toggle changes URL to #/table/ and shows tables', () => {
        cy.visit('http://localhost:3000/');
        cy.get('[data-testid="graph-container"]', { timeout: 15000 }).should('exist');

        cy.get('[data-testid="view-mode-table"]').click();

        cy.location('hash').should('include', '/table/');
        cy.get('[data-testid="graph-nodes-table"]').should('be.visible');
        cy.get('[data-testid="graph-edges-table"]').should('be.visible');
    });

    it('clicking graph toggle changes URL to #/graph/ and shows graph', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', { timeout: 15000 }).should('be.visible');

        cy.get('[data-testid="view-mode-graph"]').click();

        cy.location('hash').should('include', '/graph/');
        cy.get('[data-testid="graph-container"]').should('exist');
        cy.get('[data-testid="graph-nodes-table"]').should('not.exist');
    });

    it('preserves filter params when switching view mode', () => {
        cy.visit('http://localhost:3000/#/table/?yearFrom=2022');
        cy.get('[data-testid="graph-nodes-table"]', { timeout: 15000 }).should('be.visible');

        cy.get('[data-testid="view-mode-graph"]').click();

        cy.location('hash').should('match', /\/graph\/\?.*yearFrom=2022/);
    });
});
