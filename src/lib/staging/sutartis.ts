import {db} from '@/lib/db';
import {isFresh, type CacheEntry} from './types';
import type {SutartisRaw} from '@/lib/viespirkiai/types';

const TTL_HOURS = Number(process.env.STAGING_TTL_SUTARTIS_HOURS ?? 168);

export async function getSutartis(sutartiesUnikalusID: string): Promise<CacheEntry<SutartisRaw> | null> {
    const row = await db.stagingSutartis.findUnique({where: {sutartiesUnikalusID}});
    if (!row) return null;
    if (!isFresh(row.fetchedAt, TTL_HOURS)) return null;
    return {data: row.data as unknown as SutartisRaw, fetchedAt: row.fetchedAt};
}

export async function upsertSutartis(sutartiesUnikalusID: string, data: SutartisRaw): Promise<void> {
    await db.stagingSutartis.upsert({
        where: {sutartiesUnikalusID},
        update: {data: data as object, fetchedAt: new Date()},
        create: {sutartiesUnikalusID, data: data as object, fetchedAt: new Date()},
    });
}
