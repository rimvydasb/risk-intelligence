import * as fs from 'fs';
import * as path from 'path';
import {parseSutartis} from '../sutartis';
import type {SutartisRaw} from '@/lib/viespirkiai/types';

function loadFixture(): SutartisRaw {
    const p = path.join(process.cwd(), 'docs/examples/sutartis/2008059225.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as SutartisRaw;
}

describe('parseSutartis', () => {
    const raw = loadFixture();

    it('creates a Contract node', () => {
        const {nodes} = parseSutartis(raw);
        const contract = nodes.find((n) => n.data.type === 'Contract');
        expect(contract).toBeDefined();
        expect(contract!.data.id).toMatch(/^contract:/);
    });

    it('creates buyer and supplier org nodes', () => {
        const {nodes} = parseSutartis(raw);
        const orgs = nodes.filter((n) => n.data.type === 'PrivateCompany');
        expect(orgs.length).toBe(2);
    });

    it('creates Signed edges from buyer and supplier to contract', () => {
        const {edges} = parseSutartis(raw);
        expect(edges.length).toBe(2);
        for (const e of edges) {
            expect(e.data.type).toBe('Signed');
            expect(e.data.target).toMatch(/^contract:/);
        }
    });

    it('captures contract value', () => {
        const {nodes} = parseSutartis(raw);
        const contract = nodes.find((n) => n.data.type === 'Contract');
        expect(contract!.data.value).toBe(1200);
    });

    it('propagates contract value onto both Signed edges', () => {
        const {edges} = parseSutartis(raw);
        for (const e of edges) {
            expect(e.data.value).toBe(1200);
        }
    });
});
