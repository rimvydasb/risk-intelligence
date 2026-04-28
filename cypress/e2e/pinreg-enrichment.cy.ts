const MOCK_PINREG_ELEMENTS = {
    nodes: [
        {
            data: {
                id: 'org:302913276',
                label: 'CPO LT',
                type: 'PrivateCompany',
                expanded: false,
            },
        },
        {
            data: {
                id: 'org:188659752',
                label: 'Centrinė projektų valdymo agentūra',
                type: 'PublicCompany',
                expanded: false,
            },
        },
    ],
    edges: [
        {
            data: {
                id: 'edge:person:test-deklaracija:org:302913276:Director',
                source: 'person:026a8bda-cae8-49a8-b812-e1a1b88827d7',
                target: 'org:302913276',
                type: 'Director',
                label: 'CPO LT',
                fromDate: '2020-09-22',
                tillDate: null,
            },
        },
    ],
};

describe('Pinreg enrichment — person node click', () => {
    beforeEach(() => {
        Cypress.on('uncaught:exception', () => false);
    });

    it('clicking a person node triggers pinreg fetch and merges new org nodes into graph', () => {
        // Intercept the pinreg API call and return a mock response
        cy.intercept('POST', '/api/v1/person/pinreg', {
            statusCode: 200,
            body: {elements: MOCK_PINREG_ELEMENTS},
        }).as('pinregExpand');

        cy.visit('http://localhost:3000/#/table/');
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 20000}).should('be.visible');
        cy.get('[data-testid="graph-nodes-table"] tbody tr').should('have.length.at.least', 1);

        // Switch to graph view so we can click on a person node via search
        cy.get('[data-testid="view-mode-graph"]').click();
        cy.get('[data-testid="graph-container"]', {timeout: 15000}).should('exist');

        // Find a Person node via search and click it to trigger pinreg fetch
        cy.get('input[placeholder="Search Company or Person..."]').type('ALEKSANDRAS ZUBRIAKOVAS');
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .should('have.length.at.least', 1)
            .first()
            .click({force: true});

        // Sidebar should open for the person node
        cy.contains('Node Details').should('be.visible');
        cy.contains('ALEKSANDRAS ZUBRIAKOVAS').should('be.visible');

        // The pinreg API call should have been made
        cy.wait('@pinregExpand').then((interception) => {
            expect(interception.request.body).to.have.property('vardas', 'ALEKSANDRAS ZUBRIAKOVAS');
            expect(interception.request.body.personId).to.match(/^person:/);
        });

        // Loading indicator should have appeared and resolved
        // (difficult to catch in time, so just verify no persisting spinner)
        cy.contains('Loading interest declarations…').should('not.exist');

        // Switch to table view to verify the new org stub nodes merged into graph
        cy.get('[data-testid="view-mode-table"]').click();
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 15000}).should('be.visible');

        // The mock response nodes should now be in the table
        cy.get('[data-testid="graph-nodes-table"] tbody [data-testid="node-id"]')
            .filter(':contains("org:302913276")')
            .should('have.length', 1);

        cy.get('[data-testid="graph-nodes-table"] tbody [data-testid="node-label"]')
            .filter(':contains("CPO LT")')
            .should('have.length', 1);
    });

    it('repeated person node clicks do not duplicate pinreg org nodes', () => {
        cy.intercept('POST', '/api/v1/person/pinreg', {
            statusCode: 200,
            body: {elements: MOCK_PINREG_ELEMENTS},
        }).as('pinregExpand');

        cy.visit('http://localhost:3000/#/graph/');
        cy.get('[data-testid="graph-container"]', {timeout: 20000}).should('exist');

        // Click the same person node twice via search
        cy.get('input[placeholder="Search Company or Person..."]').type('ALEKSANDRAS ZUBRIAKOVAS');
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .first()
            .click({force: true});
        cy.wait('@pinregExpand');

        // Close sidebar and click the same person again
        cy.get('[data-testid="close-sidebar"]').click();
        cy.get('input[placeholder="Search Company or Person..."]').clear().type('ALEKSANDRAS ZUBRIAKOVAS');
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .first()
            .click({force: true});

        // React Query caches the result; pinreg endpoint should not be called again
        cy.wait(1000);
        cy.get('@pinregExpand.all').should('have.length', 1);

        // Switch to table and verify no duplicates
        cy.get('[data-testid="view-mode-table"]').click();
        cy.get('[data-testid="graph-nodes-table"]', {timeout: 15000}).should('be.visible');

        cy.get('[data-testid="graph-nodes-table"] tbody [data-testid="node-id"]')
            .filter(':contains("org:302913276")')
            .should('have.length', 1);
    });

    it('shows loading indicator in sidebar while pinreg is fetching', () => {
        // Delay the response so we can catch the loading indicator
        cy.intercept('POST', '/api/v1/person/pinreg', (req) => {
            req.reply({
                delay: 1500,
                statusCode: 200,
                body: {elements: MOCK_PINREG_ELEMENTS},
            });
        }).as('pinregSlowExpand');

        cy.visit('http://localhost:3000/#/graph/');
        cy.get('[data-testid="graph-container"]', {timeout: 20000}).should('exist');

        cy.get('input[placeholder="Search Company or Person..."]').type('ALEKSANDRAS ZUBRIAKOVAS');
        cy.get('.MuiAutocomplete-option', {timeout: 10000})
            .first()
            .click({force: true});

        // Loading indicator should appear while fetching
        cy.contains('Loading interest declarations…').should('be.visible');

        // After request completes, spinner disappears
        cy.wait('@pinregSlowExpand');
        cy.contains('Loading interest declarations…').should('not.exist');
    });
});
