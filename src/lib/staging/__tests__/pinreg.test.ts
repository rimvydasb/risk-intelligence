/**
 * @jest-environment node
 */
import {db} from '@/lib/db';
import {getPinreg, upsertPinreg} from '../pinreg';
import type {McpPinregRaw} from '@/lib/viespirkiai/types';

const SAMPLE: McpPinregRaw = {
    darbovietes: [
        {
            jarKodas: '302913276',
            deklaracija: '9bf3bd8b-62ea-496b-a2ef-1d2409a97346',
            vardas: 'ROBERTAS',
            pavarde: 'VYŠNIAUSKAS',
            pavadinimas: 'CPO LT',
            rysioPradzia: '2020-09-22',
            pareiguTipasPavadinimas: 'Ekspertas',
        },
    ],
    rysiaiSuJa: [],
    sutuoktinioDarbovietes: [],
    total: 1,
    limit: 20,
};

const VARDAS = 'ROBERTAS VYŠNIAUSKAS';

beforeEach(async () => {
    await db.stagingPinreg.deleteMany();
});

afterAll(async () => {
    await db.$disconnect();
});

describe('staging/pinreg', () => {
    it('returns null when record does not exist', async () => {
        const result = await getPinreg(VARDAS);
        expect(result).toBeNull();
    });

    it('upserts and retrieves a fresh record', async () => {
        await upsertPinreg(VARDAS, SAMPLE);
        const result = await getPinreg(VARDAS);
        expect(result).not.toBeNull();
        expect((result!.data.darbovietes ?? [])[0].pavadinimas).toBe('CPO LT');
    });

    it('returns null for a stale record (fetchedAt 48h ago)', async () => {
        const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1_000);
        await db.stagingPinreg.create({
            data: {vardas: VARDAS, data: SAMPLE as object, fetchedAt: staleDate},
        });
        const result = await getPinreg(VARDAS);
        expect(result).toBeNull();
    });

    it('upsert overwrites existing record', async () => {
        await upsertPinreg(VARDAS, SAMPLE);
        const updated: McpPinregRaw = {...SAMPLE, total: 99};
        await upsertPinreg(VARDAS, updated);
        const result = await getPinreg(VARDAS);
        expect(result!.data.total).toBe(99);
    });
});
