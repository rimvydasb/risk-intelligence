import { db } from '@/lib/db';
import { isFresh, type CacheEntry } from './types';
import type { PirkamasRaw } from '@/lib/viespirkiai/types';

const TTL_HOURS = Number(process.env.STAGING_TTL_PIRKIMAS_HOURS ?? 24);

export async function getPirkimas(
  pirkimoId: string,
): Promise<CacheEntry<PirkamasRaw> | null> {
  const row = await db.stagingPirkimas.findUnique({ where: { pirkimoId } });
  if (!row) return null;
  if (!isFresh(row.fetchedAt, TTL_HOURS)) return null;
  return { data: row.data as unknown as PirkamasRaw, fetchedAt: row.fetchedAt };
}

export async function upsertPirkimas(pirkimoId: string, data: PirkamasRaw): Promise<void> {
  await db.stagingPirkimas.upsert({
    where: { pirkimoId },
    update: { data: data as object, fetchedAt: new Date() },
    create: { pirkimoId, data: data as object, fetchedAt: new Date() },
  });
}
