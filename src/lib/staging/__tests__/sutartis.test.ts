/**
 * @jest-environment node
 */
import { db } from '@/lib/db';
import { getSutartis, upsertSutartis } from '../sutartis';
import type { SutartisRaw } from '@/lib/viespirkiai/types';

const SAMPLE: SutartisRaw = {
  sutartiesUnikalusID: '2008059225',
  perkanciojiOrganizacija: 'Šiaulių kultūros centras',
  tiekejas: 'Asociacija',
  verte: 1200,
};

beforeEach(async () => {
  await db.stagingSutartis.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('staging/sutartis', () => {
  it('returns null when record does not exist', async () => {
    expect(await getSutartis('missing-id')).toBeNull();
  });

  it('upserts and retrieves a fresh record', async () => {
    await upsertSutartis('2008059225', SAMPLE);
    const result = await getSutartis('2008059225');
    expect(result).not.toBeNull();
    expect(result!.data.verte).toBe(1200);
  });

  it('returns null for a stale record (168h+ old)', async () => {
    const staleDate = new Date(Date.now() - 200 * 60 * 60 * 1_000);
    await db.stagingSutartis.create({
      data: { sutartiesUnikalusID: 'stale-id', data: SAMPLE as object, fetchedAt: staleDate },
    });
    expect(await getSutartis('stale-id')).toBeNull();
  });
});
