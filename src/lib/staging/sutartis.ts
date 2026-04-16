import {db} from '@/lib/db';
import {isFresh} from './types';
import type {ContractSummary} from '@/lib/parsers/types';
import type {SutartisRaw} from '@/lib/viespirkiai/types';

const LIST_TTL_HOURS = Number(process.env.STAGING_TTL_SUTARTIS_LIST_HOURS ?? 24);

/** Returns scraped contract summaries for a buyer/supplier pair if the cache is fresh. */
export async function getSutartisContracts(
    buyerCode: string,
    supplierCode: string,
): Promise<ContractSummary[] | null> {
    const rows = await db.stagingSutartis.findMany({where: {buyerCode, supplierCode}});
    if (rows.length === 0) return null;

    const latestFetch = rows.reduce(
        (latest, row) => (row.fetchedAt > latest ? row.fetchedAt : latest),
        rows[0].fetchedAt,
    );
    if (!isFresh(latestFetch, LIST_TTL_HOURS)) return null;

    return rows.map((row) => ({
        sutartiesUnikalusID: row.sutartiesUnikalusID,
        name: row.name,
        fromDate: row.fromDate,
        tillDate: row.tillDate,
        value: row.value,
    }));
}

/** Bulk-upserts scraped contract rows. Does NOT touch data or dataFetchedAt columns. */
export async function upsertSutartisContracts(
    summaries: ContractSummary[],
    buyerCode: string,
    supplierCode: string,
): Promise<void> {
    const now = new Date();
    await Promise.all(
        summaries.map((s) =>
            db.stagingSutartis.upsert({
                where: {sutartiesUnikalusID: s.sutartiesUnikalusID},
                update: {
                    buyerCode,
                    supplierCode,
                    name: s.name,
                    fromDate: s.fromDate ?? null,
                    tillDate: s.tillDate ?? null,
                    value: s.value ?? null,
                    fetchedAt: now,
                },
                create: {
                    sutartiesUnikalusID: s.sutartiesUnikalusID,
                    buyerCode,
                    supplierCode,
                    name: s.name,
                    fromDate: s.fromDate ?? null,
                    tillDate: s.tillDate ?? null,
                    value: s.value ?? null,
                    fetchedAt: now,
                },
            }),
        ),
    );
}

/** Returns the full JSON blob for a contract if it has been fetched, else null. */
export async function getSutartisDetail(sutartiesUnikalusID: string): Promise<SutartisRaw | null> {
    const row = await db.stagingSutartis.findUnique({where: {sutartiesUnikalusID}});
    if (!row || !row.data) return null;
    return row.data as unknown as SutartisRaw;
}

/** Fills the data column for an existing contract row (called on-demand when user clicks a contract node). */
export async function upsertSutartisDetail(sutartiesUnikalusID: string, data: SutartisRaw): Promise<void> {
    await db.stagingSutartis.update({
        where: {sutartiesUnikalusID},
        data: {data: data as object, dataFetchedAt: new Date()},
    });
}
