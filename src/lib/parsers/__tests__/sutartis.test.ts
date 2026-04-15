import * as fs from 'fs';
import * as path from 'path';
import {parseSutartis, parseSutartisSummary} from '../sutartis';
import type {SutartisRaw} from '@/lib/viespirkiai/types';
import type {ContractSummary} from '../types';

function loadFixture(): SutartisRaw {
    const p = path.join(process.cwd(), 'docs/examples/sutartis/2008059225.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as SutartisRaw;
}

const makeSummary = (overrides: Partial<ContractSummary> = {}): ContractSummary => ({
    sutartiesUnikalusID: 'ctr-1',
    name: 'Test Contract',
    fromDate: '2024-01-01',
    tillDate: '2024-12-31',
    value: 10000,
    ...overrides,
});

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

describe('parseSutartisSummary', () => {
    const anchorId = 'org:111111111';
    const partnerId = 'org:222222222';

    it('creates Contract node and two Signed edges per summary', () => {
        const {nodes, edges} = parseSutartisSummary([makeSummary()], anchorId, partnerId, true);
        const contract = nodes.find((n) => n.data.type === 'Contract');
        expect(contract).toBeDefined();
        expect(contract!.data.fromDate).toBe('2024-01-01');
        expect(contract!.data.tillDate).toBe('2024-12-31');
        expect(contract!.data.value).toBe(10000);
        expect(edges).toHaveLength(2);
        expect(edges.find((e) => e.data.label === 'Buyer')!.data.source).toBe(anchorId);
        expect(edges.find((e) => e.data.label === 'Supplier')!.data.source).toBe(partnerId);
    });

    it('swaps buyer/supplier when anchor is supplier (isAnchorBuyer=false)', () => {
        const {edges} = parseSutartisSummary([makeSummary()], anchorId, partnerId, false);
        expect(edges.find((e) => e.data.label === 'Buyer')!.data.source).toBe(partnerId);
        expect(edges.find((e) => e.data.label === 'Supplier')!.data.source).toBe(anchorId);
    });

    it('excludes contracts whose tillDate is before yearFrom', () => {
        const {nodes} = parseSutartisSummary(
            [makeSummary({fromDate: '2020-01-01', tillDate: '2021-12-31'})],
            anchorId,
            partnerId,
            true,
            {yearFrom: '2024-01-01'},
        );
        expect(nodes).toHaveLength(0);
    });

    it('excludes contracts whose fromDate is after yearTo', () => {
        const {nodes} = parseSutartisSummary(
            [makeSummary({fromDate: '2026-01-01', tillDate: '2026-12-31'})],
            anchorId,
            partnerId,
            true,
            {yearTo: '2025-12-31'},
        );
        expect(nodes).toHaveLength(0);
    });

    it('includes contracts with null dates regardless of filter', () => {
        const {nodes} = parseSutartisSummary(
            [makeSummary({fromDate: null, tillDate: null})],
            anchorId,
            partnerId,
            true,
            {yearFrom: '2024-01-01', yearTo: '2024-12-31'},
        );
        expect(nodes).toHaveLength(1);
    });

    it('excludes contracts below minContractValue', () => {
        const {nodes} = parseSutartisSummary(
            [makeSummary({value: 500})],
            anchorId,
            partnerId,
            true,
            {minContractValue: 1000},
        );
        expect(nodes).toHaveLength(0);
    });
});
