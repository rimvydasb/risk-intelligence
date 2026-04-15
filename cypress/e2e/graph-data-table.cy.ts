describe('Graph Data Table — view mode toggle', () => {
    beforeEach(() => {
        Cypress.on('uncaught:exception', () => false);
    });

    it('navigates directly to #/table/ and shows both tables', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 15000}).should('be.visible');
        cy.get('[data-testid="graph-edges-table"]').should('be.visible');
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);
        cy.get('[data-testid="graph-edges-table"] tbody tr').should('have.length.at.least', 1);
    });

    it('navigates directly to #/graph/ and shows graph, not tables', () => {
        cy.visit('http://localhost:3000/#/graph/');
        cy.get('[data-testid="graph-container"]', {timeout: 15000}).should('exist');
        cy.get('[data-testid="graph-nodes-table"]').should('not.exist');
        cy.get('[data-testid="graph-edges-table"]').should('not.exist');
    });

    it('clicking table toggle changes URL to #/table/ and shows tables', () => {
        cy.visit('http://localhost:3000/');
        cy.get('[data-testid="graph-container"]', {timeout: 15000}).should('exist');

        cy.get('[data-testid="view-mode-table"]').click();

        cy.location('hash').should('include', '/table/');
        cy.get('[data-testid="graph-nodes-table"]').should('be.visible');
        cy.get('[data-testid="graph-edges-table"]').should('be.visible');
    });

    it('clicking graph toggle changes URL to #/graph/ and shows graph', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 15000}).should('be.visible');

        cy.get('[data-testid="view-mode-graph"]').click();

        cy.location('hash').should('include', '/graph/');
        cy.get('[data-testid="graph-container"]').should('exist');
        cy.get('[data-testid="graph-nodes-table"]').should('not.exist');
    });

    it('preserves filter params when switching view mode', () => {
        cy.visit('http://localhost:3000/#/table/?yearFrom=2022');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 15000}).should('be.visible');

        cy.get('[data-testid="view-mode-graph"]').click();

        cy.location('hash').should('match', /\/graph\/\?.*yearFrom=2022/);
    });

    it('applies year filter and re-fetches data for the table', () => {
        cy.intercept('GET', '/api/v1/graph/expand/**').as('expand');

        cy.visit('http://localhost:3000/#/table/');
        cy.wait('@expand', {timeout: 20000});
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);

        // Count rows before applying filter
        cy.get('[data-testid="graph-nodes-table"] tbody tr').its('length').as('countBefore');

        // Apply Year From = 2022
        cy.get('[data-testid="filter-year-from"]').parent().click();
        cy.contains('[role="option"]', '2022').click();
        cy.get('[data-testid="filter-apply"]').click();

        // A new expand request must include the year query param
        cy.wait('@expand').its('request.url').should('include', 'year=2022');

        // Table is repopulated (anchor org always present)
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);
    });

    it('changing filter again re-fetches without accumulating stale rows', () => {
        cy.intercept('GET', '/api/v1/graph/expand/**').as('expand');

        cy.visit('http://localhost:3000/#/table/');
        cy.wait('@expand', {timeout: 20000});

        // Apply first filter (2022)
        cy.get('[data-testid="filter-year-from"]').parent().click();
        cy.contains('[role="option"]', '2022').click();
        cy.get('[data-testid="filter-apply"]').click();
        cy.wait('@expand').its('request.url').should('include', 'year=2022');
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).its('length').as('countAfterFirst');

        // Change to a different filter (2024)
        cy.get('[data-testid="filter-year-from"]').parent().click();
        cy.contains('[role="option"]', '2024').click();
        cy.get('[data-testid="filter-apply"]').click();
        cy.wait('@expand').its('request.url').should('include', 'year=2024');

        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).its('length').as('countAfterSecond');

        // Row count must not have grown by accumulation — it must reflect only the
        // second filter's result, i.e. <= (first result + second result combined).
        // The clearest signal: the org anchor is always present exactly once.
        cy.get('[data-testid="graph-nodes-table"] tbody [data-testid="node-id"]')
            .filter(':contains("org:110053842")')
            .should('have.length', 1);
    });

    it('resetting filter after filtering re-fetches without year param', () => {
        cy.intercept('GET', '/api/v1/graph/expand/**').as('expand');

        cy.visit('http://localhost:3000/#/table/');
        cy.wait('@expand', {timeout: 20000});

        // Apply filter
        cy.get('[data-testid="filter-year-from"]').parent().click();
        cy.contains('[role="option"]', '2023').click();
        cy.get('[data-testid="filter-apply"]').click();
        cy.wait('@expand').its('request.url').should('include', 'year=2023');

        // Reset — React Query may serve the no-filter result from cache (no new network
        // call is guaranteed), so we test URL + UI state, not a third network request.
        cy.get('[data-testid="filter-reset"]').click();

        // URL must no longer carry year params
        cy.url().should('not.include', 'yearFrom');
        cy.url().should('not.include', 'yearTo');

        // Filter reset button disappears (no active filters)
        cy.get('[data-testid="filter-reset"]').should('not.exist');

        // Table stays populated (data served from cache or re-fetched)
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);
    });

    it('org:126280418 shows resolved company name in table, not Nežinomas', () => {
        // The anchor org 110053842 has 126280418 in topPirkejai with pavadinimas "Nežinomas".
        // The expand endpoint must enrich it before returning — this test verifies the table
        // reflects the real name fetched from viespirkiai.org.
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 20000}).should('be.visible');

        cy.get('[data-testid="graph-nodes-table"] tbody tr')
            .contains('[data-testid="node-id"]', 'org:126280418')
            .closest('tr')
            .find('[data-testid="node-label"]')
            .should('not.contain', 'Nežinomas')
            .and('not.contain', 'Nezinomas')
            .and('not.be.empty');
    });
});
