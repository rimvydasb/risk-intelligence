/**
 * @jest-environment node
 */
import { db } from '@/lib/db';
import { getAsmuo, upsertAsmuo } from '../asmuo';
import type { AsmuoRaw } from '@/lib/viespirkiai/types';

const SAMPLE: AsmuoRaw = {
  jar: { jarKodas: 110053842, pavadinimas: 'Lietuvos geležinkeliai' },
};

beforeEach(async () => {
  await db.stagingAsmuo.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('staging/asmuo', () => {
  it('returns null when record does not exist', async () => {
    const result = await getAsmuo('110053842');
    expect(result).toBeNull();
  });

  it('upserts and retrieves a fresh record', async () => {
    await upsertAsmuo('110053842', SAMPLE);
    const result = await getAsmuo('110053842');
    expect(result).not.toBeNull();
    expect(result!.data.jar?.pavadinimas).toBe('Lietuvos geležinkeliai');
  });

  it('returns null for a stale record (fetchedAt in the past)', async () => {
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1_000); // 48h ago
    await db.stagingAsmuo.create({
      data: { jarKodas: '999', data: SAMPLE as object, fetchedAt: staleDate },
    });
    // TTL is 24h by default so 48h-old record is stale
    const result = await getAsmuo('999');
    expect(result).toBeNull();
  });

  it('upsert overwrites existing record', async () => {
    await upsertAsmuo('110053842', SAMPLE);
    const updated: AsmuoRaw = { jar: { jarKodas: 110053842, pavadinimas: 'Updated Name' } };
    await upsertAsmuo('110053842', updated);
    const result = await getAsmuo('110053842');
    expect(result!.data.jar?.pavadinimas).toBe('Updated Name');
  });
});
