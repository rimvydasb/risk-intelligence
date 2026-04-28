import * as fs from 'fs';
import * as path from 'path';
import {parsePinreg} from '../pinreg';
import type {McpPinregRaw} from '@/lib/viespirkiai/types';

function loadFixture(): McpPinregRaw {
    const p = path.join(process.cwd(), 'docs/examples/pinreg', 'mcp_pinreg.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as McpPinregRaw;
}

const PERSON_ID = 'person:9bf3bd8b-62ea-496b-a2ef-1d2409a97346';
const fixture = loadFixture();

describe('parsePinreg — mcp_pinreg.json fixture', () => {
    it('produces org stub nodes for each unique jarKodas in darbovietes', () => {
        const {nodes} = parsePinreg(fixture, PERSON_ID);
        const orgIds = nodes.map((n) => n.data.id).filter((id) => id.startsWith('org:'));
        // fixture has jarKodas: 302913276, 211950810, 302296985, 302536989 in darbovietes
        expect(orgIds).toContain('org:302913276');
        expect(orgIds).toContain('org:211950810');
        expect(orgIds).toContain('org:302296985');
        expect(orgIds).toContain('org:302536989');
    });

    it('deduplicates org nodes — 302296985 appears twice but only one node', () => {
        const {nodes} = parsePinreg(fixture, PERSON_ID);
        const count = nodes.filter((n) => n.data.id === 'org:302296985').length;
        expect(count).toBe(1);
    });

    it('org stub nodes have expanded=false', () => {
        const {nodes} = parsePinreg(fixture, PERSON_ID);
        const orgNodes = nodes.filter((n) => n.data.id.startsWith('org:'));
        for (const n of orgNodes) {
            expect(n.data.expanded).toBe(false);
        }
    });

    it('edges from personId to org nodes are created for darbovietes', () => {
        const {edges} = parsePinreg(fixture, PERSON_ID);
        const empEdges = edges.filter(
            (e) => e.data.source === PERSON_ID && e.data.target.startsWith('org:'),
        );
        expect(empEdges.length).toBeGreaterThan(0);
    });

    it('maps darbovietesTipas EKSPERTO to Official edge type', () => {
        const {edges} = parsePinreg(fixture, PERSON_ID);
        // CPO LT entry has pareiguTipasPavadinimas = "Pirkimų procedūrose dalyvaujantys ekspertai"
        const cpoEdges = edges.filter(
            (e) => e.data.source === PERSON_ID && e.data.target === 'org:302913276',
        );
        expect(cpoEdges.length).toBeGreaterThan(0);
        expect(cpoEdges[0].data.type).toBe('Official');
    });

    it('maps Darbuotojas pareiguTipas to Employment edge type', () => {
        const {edges} = parsePinreg(fixture, PERSON_ID);
        // Vilniaus universitetas: pareiguTipasPavadinimas = "Darbuotojas"
        const vuEdges = edges.filter(
            (e) => e.data.source === PERSON_ID && e.data.target === 'org:211950810',
        );
        expect(vuEdges.length).toBeGreaterThan(0);
        expect(vuEdges[0].data.type).toBe('Employment');
    });

    it('produces org stub nodes for rysiaiSuJa entries', () => {
        const {nodes} = parsePinreg(fixture, PERSON_ID);
        // fixture rysiaiSuJa: 191691799, 302826889, 110648893, 120750163, 110053842
        const orgIds = nodes.map((n) => n.data.id);
        expect(orgIds).toContain('org:191691799');
        expect(orgIds).toContain('org:302826889');
        expect(orgIds).toContain('org:110053842');
    });

    it('maps Komiteto narys to Director edge type', () => {
        const {edges} = parsePinreg(fixture, PERSON_ID);
        const epsoEdges = edges.filter(
            (e) => e.data.source === PERSON_ID && e.data.target === 'org:302826889',
        );
        expect(epsoEdges.length).toBeGreaterThan(0);
        // First entry is "Komiteto narys" → Director
        const directorEdge = epsoEdges.find((e) => e.data.type === 'Director');
        expect(directorEdge).toBeDefined();
    });

    it('maps Valdybos narys to Director edge type', () => {
        const {edges} = parsePinreg(fixture, PERSON_ID);
        // AB "Lietuvos geležinkeliai" (110053842) has "Valdybos narys"
        const lgEdges = edges.filter(
            (e) => e.data.source === PERSON_ID && e.data.target === 'org:110053842' && e.data.type === 'Director',
        );
        expect(lgEdges.length).toBeGreaterThan(0);
    });

    it('produces no person nodes (person is the input, not output)', () => {
        const {nodes} = parsePinreg(fixture, PERSON_ID);
        const personNodes = nodes.filter((n) => n.data.type === 'Person');
        // No person nodes expected unless sutuoktinioDarbovietes is non-empty
        // fixture has sutuoktinioDarbovietes = []
        expect(personNodes.length).toBe(0);
    });

    it('produces no nodes or edges for empty raw', () => {
        const {nodes, edges} = parsePinreg({}, PERSON_ID);
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
    });

    it('handles sutuoktinioDarbovietes spouse entries', () => {
        const rawWithSpouse: McpPinregRaw = {
            sutuoktinioDarbovietes: [
                {
                    jarKodas: '123456789',
                    deklaracija: 'aaa-bbb-ccc',
                    pavadinimas: 'Spouse Employer UAB',
                    rysioPradzia: '2020-01-01',
                    vardas: 'JONAS',
                    pavarde: 'JONAITIS',
                    sutuoktinioVardas: 'JOLANTA',
                    sutuoktinioPavarde: 'JONAITIENĖ',
                },
            ],
        };
        const {nodes, edges} = parsePinreg(rawWithSpouse, PERSON_ID);

        const spouseNode = nodes.find((n) => n.data.id === 'person:spouse:aaa-bbb-ccc');
        expect(spouseNode).toBeDefined();
        expect(spouseNode!.data.label).toBe('JOLANTA JONAITIENĖ');
        expect(spouseNode!.data.synthesised).toBe(true);

        const orgNode = nodes.find((n) => n.data.id === 'org:123456789');
        expect(orgNode).toBeDefined();
        expect(orgNode!.data.expanded).toBe(false);

        const spouseEdge = edges.find((e) => e.data.type === 'Spouse');
        expect(spouseEdge).toBeDefined();
        expect(spouseEdge!.data.source).toBe(PERSON_ID);
        expect(spouseEdge!.data.target).toBe('person:spouse:aaa-bbb-ccc');

        const empEdge = edges.find((e) => e.data.type === 'Employment' && e.data.source === 'person:spouse:aaa-bbb-ccc');
        expect(empEdge).toBeDefined();
        expect(empEdge!.data.target).toBe('org:123456789');
    });
});
