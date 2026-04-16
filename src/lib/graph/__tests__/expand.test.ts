/**
 * @jest-environment node
 */
import {db} from '@/lib/db';
import {expandOrg, isResolvableJarKodas} from '../expand';
import * as viespirkiai from '@/lib/viespirkiai/client';
import * as fs from 'fs';
import * as path from 'path';
import type {AsmuoRaw} from '@/lib/viespirkiai/types';

jest.mock('@/lib/viespirkiai/client');
const mockFetchAsmuo = viespirkiai.fetchAsmuo as jest.Mock;
const mockFetchSutartisList = viespirkiai.fetchSutartisList as jest.Mock;

function loadFixture(): AsmuoRaw {
    return JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'docs/examples/asmuo/110053842.json'), 'utf-8'),
    ) as AsmuoRaw;
}

/** Minimal AsmuoRaw used as an enrichment response for stub org nodes. */
const EMPTY_ASMUO: AsmuoRaw = {jar: undefined};

beforeEach(async () => {
    await db.stagingAsmuo.deleteMany();
    jest.clearAllMocks();
    mockFetchAsmuo.mockResolvedValue(EMPTY_ASMUO);
    // Default: no contracts for any pair (prevents upsertSutartisContracts from crashing).
    mockFetchSutartisList.mockResolvedValue([]);
});

afterAll(async () => {
    await db.$disconnect();
});

describe('graph/expand — isResolvableJarKodas', () => {
    it('accepts valid Lithuanian company codes', () => {
        expect(isResolvableJarKodas('126280418')).toBe(true);
        expect(isResolvableJarKodas('110053842')).toBe(true);
        expect(isResolvableJarKodas('100000')).toBe(true);
    });

    it('rejects synthetic / invalid codes', () => {
        expect(isResolvableJarKodas('0')).toBe(false);
        expect(isResolvableJarKodas('803')).toBe(false);
        expect(isResolvableJarKodas('99999')).toBe(false);
        expect(isResolvableJarKodas('')).toBe(false);
        expect(isResolvableJarKodas('abc')).toBe(false);
    });
});

describe('graph/expand — expandOrg', () => {
    it('fetches from viespirkiai when staging cache is empty', async () => {
        const fixture = loadFixture();
        mockFetchAsmuo.mockResolvedValueOnce(fixture); // anchor fetch

        const result = await expandOrg('110053842');
        expect(mockFetchAsmuo).toHaveBeenCalledWith('110053842');
        expect(result.meta.cached).toBe(false);
        expect(result.elements.nodes.length).toBeGreaterThan(0);
        expect(result.meta.anchorId).toBe('org:110053842');
    });

    it('uses cached staging data when fresh', async () => {
        const fixture = loadFixture();
        // Pre-populate both the anchor and the known Nežinomas stub so no fetches are needed.
        const realEnrichmentData: AsmuoRaw = {jar: {jarKodas: 126280418, pavadinimas: 'Cached Company'}};
        await db.stagingAsmuo.createMany({
            data: [
                {jarKodas: '110053842', data: fixture as object, fetchedAt: new Date()},
                {jarKodas: '126280418', data: realEnrichmentData as object, fetchedAt: new Date()},
            ],
        });

        const result = await expandOrg('110053842');
        expect(mockFetchAsmuo).not.toHaveBeenCalled();
        expect(result.meta.cached).toBe(true);
    });

    it('refetches when staging entry is stale', async () => {
        const fixture = loadFixture();
        const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1_000);
        await db.stagingAsmuo.create({
            data: {jarKodas: '110053842', data: fixture as object, fetchedAt: staleDate},
        });
        mockFetchAsmuo.mockResolvedValueOnce(fixture); // anchor re-fetch

        const result = await expandOrg('110053842');
        // One call for the stale anchor; enrichment calls use the default mock.
        expect(mockFetchAsmuo).toHaveBeenCalledWith('110053842');
        expect(result.meta.cached).toBe(false);
    });

    it('returns correct node/edge counts', async () => {
        const fixture = loadFixture();
        mockFetchAsmuo.mockResolvedValueOnce(fixture);

        const result = await expandOrg('110053842');
        expect(result.meta.totalNodes).toBe(result.elements.nodes.length);
        expect(result.meta.totalEdges).toBe(result.elements.edges.length);
    });

    it('enriches a Nežinomas stub node with the real company name', async () => {
        const fixture = loadFixture();
        const enrichedData: AsmuoRaw = {jar: {jarKodas: 126280418, pavadinimas: 'Real Company Name UAB'}};

        mockFetchAsmuo
            .mockResolvedValueOnce(fixture) // anchor fetch
            .mockResolvedValueOnce(enrichedData); // enrichment fetch for 126280418

        const result = await expandOrg('110053842');

        const stubNode = result.elements.nodes.find((n) => n.data.id === 'org:126280418');
        expect(stubNode).toBeDefined();
        expect(stubNode!.data.label).toBe('Real Company Name UAB');
        expect(mockFetchAsmuo).toHaveBeenCalledWith('126280418');
    });

    it('uses cached staging entry for enrichment without fetching', async () => {
        const fixture = loadFixture();
        const enrichedData: AsmuoRaw = {jar: {jarKodas: 126280418, pavadinimas: 'Cached Real Name'}};

        // Anchor is not cached; stub 126280418 is cached.
        mockFetchAsmuo.mockResolvedValueOnce(fixture);
        await db.stagingAsmuo.create({
            data: {jarKodas: '126280418', data: enrichedData as object, fetchedAt: new Date()},
        });

        const result = await expandOrg('110053842');

        const stubNode = result.elements.nodes.find((n) => n.data.id === 'org:126280418');
        expect(stubNode!.data.label).toBe('Cached Real Name');
        // Only anchor was fetched; enrichment used cache.
        expect(mockFetchAsmuo).toHaveBeenCalledTimes(1);
        expect(mockFetchAsmuo).toHaveBeenCalledWith('110053842');
    });

    it('does not fetch for unresolvable codes (0, 803)', async () => {
        const fixture = loadFixture();
        mockFetchAsmuo.mockResolvedValueOnce(fixture); // only anchor

        await expandOrg('110053842');

        const calls = (mockFetchAsmuo as jest.Mock).mock.calls.map(([arg]) => arg as string);
        expect(calls).not.toContain('0');
        expect(calls).not.toContain('803');
    });

    it('leaves Nežinomas label unchanged when enrichment returns no name', async () => {
        const fixture = loadFixture();
        // Override default: enrichment returns data with no jar.pavadinimas.
        mockFetchAsmuo
            .mockResolvedValueOnce(fixture) // anchor
            .mockResolvedValueOnce(EMPTY_ASMUO); // enrichment returns nothing useful

        const result = await expandOrg('110053842');

        const stubNode = result.elements.nodes.find((n) => n.data.id === 'org:126280418');
        expect(stubNode!.data.label).toBe('Nežinomas');
    });
});
