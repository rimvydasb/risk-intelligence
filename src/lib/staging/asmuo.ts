import { db } from '@/lib/db';
import { isFresh, type CacheEntry } from './types';
import type { AsmuoRaw } from '@/lib/viespirkiai/types';

const TTL_HOURS = Number(process.env.STAGING_TTL_ASMUO_HOURS ?? 24);

export async function getAsmuo(jarKodas: string): Promise<CacheEntry<AsmuoRaw> | null> {
  const row = await db.stagingAsmuo.findUnique({ where: { jarKodas } });
  if (!row) return null;
  if (!isFresh(row.fetchedAt, TTL_HOURS)) return null;
  return { data: row.data as unknown as AsmuoRaw, fetchedAt: row.fetchedAt };
}

export async function upsertAsmuo(jarKodas: string, data: AsmuoRaw): Promise<void> {
  await db.stagingAsmuo.upsert({
    where: { jarKodas },
    update: { data: data as object, fetchedAt: new Date() },
    create: { jarKodas, data: data as object, fetchedAt: new Date() },
  });
}
