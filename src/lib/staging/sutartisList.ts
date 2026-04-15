import {db} from '@/lib/db';
import {isFresh, type CacheEntry} from './types';
import type {ContractSummary} from '@/lib/parsers/types';

const TTL_HOURS = Number(process.env.STAGING_TTL_SUTARTIS_LIST_HOURS ?? 24);

export async function getSutartisList(
    buyerCode: string,
    supplierCode: string,
): Promise<CacheEntry<ContractSummary[]> | null> {
    const row = await db.stagingSutartisList.findUnique({where: {buyerCode_supplierCode: {buyerCode, supplierCode}}});
    if (!row) return null;
    if (!isFresh(row.fetchedAt, TTL_HOURS)) return null;
    return {data: row.contracts as unknown as ContractSummary[], fetchedAt: row.fetchedAt};
}

export async function upsertSutartisList(
    buyerCode: string,
    supplierCode: string,
    contracts: ContractSummary[],
): Promise<void> {
    await db.stagingSutartisList.upsert({
        where: {buyerCode_supplierCode: {buyerCode, supplierCode}},
        update: {contracts: contracts as object[], fetchedAt: new Date()},
        create: {buyerCode, supplierCode, contracts: contracts as object[], fetchedAt: new Date()},
    });
}
