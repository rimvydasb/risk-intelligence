import {db} from '@/lib/db';
import {isFresh, type CacheEntry} from './types';
import type {McpPinregRaw} from '@/lib/viespirkiai/types';

const TTL_HOURS = Number(process.env.STAGING_TTL_PINREG_HOURS ?? 24);

export async function getPinreg(vardas: string): Promise<CacheEntry<McpPinregRaw> | null> {
    const row = await db.stagingPinreg.findUnique({where: {vardas}});
    if (!row) return null;
    if (!isFresh(row.fetchedAt, TTL_HOURS)) return null;
    return {data: row.data as unknown as McpPinregRaw, fetchedAt: row.fetchedAt};
}

export async function upsertPinreg(vardas: string, data: McpPinregRaw): Promise<void> {
    await db.stagingPinreg.upsert({
        where: {vardas},
        update: {data: data as object, fetchedAt: new Date()},
        create: {vardas, data: data as object, fetchedAt: new Date()},
    });
}
