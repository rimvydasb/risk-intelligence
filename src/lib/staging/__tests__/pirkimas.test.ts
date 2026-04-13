/**
 * @jest-environment node
 */
import { db } from '@/lib/db';
import { getPirkimas, upsertPirkimas } from '../pirkimas';
import type { PirkamasRaw } from '@/lib/viespirkiai/types';

const SAMPLE: PirkamasRaw = {
  pirkimoId: '7346201',
  jarKodas: '188605295',
  pavadinimas: 'Test tender',
};

beforeEach(async () => {
  await db.stagingPirkimas.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('staging/pirkimas', () => {
  it('returns null when record does not exist', async () => {
    expect(await getPirkimas('missing-id')).toBeNull();
  });

  it('upserts and retrieves a fresh record', async () => {
    await upsertPirkimas('7346201', SAMPLE);
    const result = await getPirkimas('7346201');
    expect(result).not.toBeNull();
    expect(result!.data.pirkimoId).toBe('7346201');
  });

  it('returns null for a stale record', async () => {
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    await db.stagingPirkimas.create({
      data: { pirkimoId: 'stale-p', data: SAMPLE as object, fetchedAt: staleDate },
    });
    expect(await getPirkimas('stale-p')).toBeNull();
  });
});
