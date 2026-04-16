/**
 * @jest-environment node
 */
import {db} from '@/lib/db';
import {
    getSutartisContracts,
    upsertSutartisContracts,
    getSutartisDetail,
    upsertSutartisDetail,
} from '../sutartis';
import type {ContractSummary} from '@/lib/parsers/types';
import type {SutartisRaw} from '@/lib/viespirkiai/types';

const SAMPLE_SUMMARY: ContractSummary = {
    sutartiesUnikalusID: '2008059225',
    name: 'IT paslaugos',
    fromDate: '2025-01-01',
    tillDate: '2025-12-31',
    value: 12000,
};

const SAMPLE_RAW: SutartisRaw = {
    sutartiesUnikalusID: '2008059225',
    perkanciojiOrganizacija: 'Šiaulių kultūros centras',
    tiekejas: 'Asociacija',
    verte: 12000,
};

beforeEach(async () => {
    await db.stagingSutartis.deleteMany();
});

afterAll(async () => {
    await db.$disconnect();
});

describe('staging/sutartis — contracts list (HTML scrape)', () => {
    it('returns null when no rows exist for pair', async () => {
        expect(await getSutartisContracts('111', '222')).toBeNull();
    });

    it('upserts and retrieves fresh contract summaries', async () => {
        await upsertSutartisContracts([SAMPLE_SUMMARY], '111111', '222222');
        const result = await getSutartisContracts('111111', '222222');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].sutartiesUnikalusID).toBe('2008059225');
        expect(result![0].value).toBe(12000);
        expect(result![0].fromDate).toBe('2025-01-01');
        expect(result![0].tillDate).toBe('2025-12-31');
    });

    it('returns null when all rows for pair are stale (24h+)', async () => {
        const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1_000);
        await db.stagingSutartis.create({
            data: {
                sutartiesUnikalusID: '9999999',
                buyerCode: 'stale-buyer',
                supplierCode: 'stale-supplier',
                name: 'old contract',
                fetchedAt: staleDate,
            },
        });
        expect(await getSutartisContracts('stale-buyer', 'stale-supplier')).toBeNull();
    });

    it('does not overwrite data column when upserting scraped rows', async () => {
        await upsertSutartisContracts([SAMPLE_SUMMARY], '111111', '222222');
        await upsertSutartisDetail('2008059225', SAMPLE_RAW);
        // Re-scrape — should not wipe the data column
        await upsertSutartisContracts([SAMPLE_SUMMARY], '111111', '222222');
        const detail = await getSutartisDetail('2008059225');
        expect(detail).not.toBeNull();
        expect(detail!.verte).toBe(12000);
    });
});

describe('staging/sutartis — contract detail (JSON on-demand)', () => {
    it('returns null when row has no data column', async () => {
        await upsertSutartisContracts([SAMPLE_SUMMARY], '111111', '222222');
        expect(await getSutartisDetail('2008059225')).toBeNull();
    });

    it('fills and retrieves data column', async () => {
        await upsertSutartisContracts([SAMPLE_SUMMARY], '111111', '222222');
        await upsertSutartisDetail('2008059225', SAMPLE_RAW);
        const detail = await getSutartisDetail('2008059225');
        expect(detail).not.toBeNull();
        expect(detail!.verte).toBe(12000);
    });
});
