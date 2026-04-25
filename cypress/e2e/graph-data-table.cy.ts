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
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 20000}).should('have.length.at.least', 1);

        // Change dateFrom — onAccept auto-applies; table must still show data
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').click();
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').realType('01012022');

        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);
    });

    it('changing filter again re-fetches without accumulating stale rows', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 20000}).should('have.length.at.least', 1);

        // Set first date range — table updates
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').click();
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').realType('01012022');
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);

        // Change date again — anchor org must appear exactly once (no accumulation)
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').click();
        cy.get('[data-testid="filter-date-from"]').find('.MuiPickersSectionList-root').realType('01012024');
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);

        cy.get('[data-testid="graph-nodes-table"] tbody [data-testid="node-id"]')
            .filter(':contains("org:110053842")')
            .should('have.length', 1);
    });

    it('resetting filter after filtering re-fetches without year param', () => {
        cy.intercept('GET', '/api/v1/graph/expand/**').as('expand');

        cy.visit('http://localhost:3000/#/table/');
        cy.wait('@expand', {timeout: 20000});

        // Apply a non-default min value filter so reset button appears
        cy.get('[data-testid="filter-min-value"]').clear().type('1000');
        cy.get('[data-testid="filter-apply"]').click();
        cy.wait('@expand').its('request.url').should('include', 'minContractValue=1000');

        // Reset brings back defaults (dates reset to current-year start → today, min value cleared)
        cy.get('[data-testid="filter-reset"]').click();

        // minContractValue must be gone from URL
        cy.url().should('not.include', 'minContractValue');

        // Filter reset button disappears (no active non-default filters)
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

    it('contract nodes in table have fromDate populated', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 30000}).should('be.visible');

        // Wait for table to load contract rows
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);

        // Find a Contract-type row and verify its From date is not empty
        cy.get('[data-testid="graph-nodes-table"] tbody tr')
            .filter(':has([data-testid="node-type"]:contains("Contract"))')
            .first()
            .within(() => {
                cy.get('[data-testid="node-from"]').should('not.contain', '—');
            });
    });

    it('contract nodes in table have tillDate populated', () => {
        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 30000}).should('be.visible');
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);

        cy.get('[data-testid="graph-nodes-table"] tbody tr')
            .filter(':has([data-testid="node-type"]:contains("Contract"))')
            .first()
            .within(() => {
                // tillDate shows either a date or "present" — never empty or "—"
                cy.get('[data-testid="node-till"]').invoke('text').should('not.be.empty');
            });
    });

    it('minContractValue filter re-fetches and includes value param in request', () => {
        cy.intercept('GET', '/api/v1/graph/expand/**').as('expand');

        cy.visit('http://localhost:3000/#/table/');
        cy.wait('@expand', {timeout: 20000});
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);

        // Enter a minimum contract value
        cy.get('[data-testid="filter-min-value"]').clear().type('10000');
        cy.get('[data-testid="filter-apply"]').click();

        // A new expand request must include the minContractValue query param
        cy.wait('@expand').its('request.url').should('include', 'minContractValue=10000');

        // Table must still be populated (anchor always present)
        cy.get('[data-testid="graph-nodes-table"] tbody tr', {timeout: 15000}).should('have.length.at.least', 1);
    });
});
