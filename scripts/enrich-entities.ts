/**
 * ETL Enrichment Script
 *
 * Fetches /asmuo/{jarKodas}.json from viespirkiai.org for every Company in the
 * local database and upserts all enrichment fields and related records.
 *
 * Rate limit: 1 request per second (ARCHITECTURE.md §9.3).
 *
 * Usage:
 *   npm run db:enrich
 *
 * Idempotent — safe to re-run; all upserts are keyed on natural composite keys.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'https://viespirkiai.org/asmuo';
const DELAY_MS = 1000;

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDate(raw: string | null | undefined): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

// Parse "YYYY-MM" or "YYYY-MM-DD" → first day of month as Date
function parseMonth(raw: string | null | undefined): Date | null {
    if (!raw) return null;
    const parts = raw.split('-');
    if (parts.length < 2) return null;
    const d = new Date(`${parts[0]}-${parts[1]}-01T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
}

// ── per-company enrichment ────────────────────────────────────────────────────

async function enrichCompany(jarKodas: string): Promise<void> {
    const url = `${BASE_URL}/${jarKodas}.json`;
    let data: any;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`  [${jarKodas}] HTTP ${res.status} — skipping`);
            return;
        }
        data = await res.json();
    } catch (err) {
        console.error(`  [${jarKodas}] Fetch error:`, err);
        return;
    }

    const jar = data?.jar ?? {};
    const sodra = data?.sodra ?? {};
    const regitra = data?.regitra ?? {};
    const sutartys = data?.sutartys ?? {};
    const teismo = data?.teismoNuosprendziai ?? {};

    // ── 1. Company enrichment fields ──────────────────────────────────────────
    await prisma.company.update({
        where: { jarKodas },
        data: {
            legalForm:            jar.formosPavadinimas ?? null,
            address:              jar.adresas ?? null,
            registeredAt:         parseDate(jar.registravimoData),
            status:               jar.statusoPavadinimas ?? null,
            statusSince:          parseDate(jar.statusasNuo),
            dataAsOf:             parseDate(jar.duomenuData),
            employeeCount:        sodra.draustieji ?? null,
            avgSalary:            sodra.vidutinisAtlyginimas ?? null,
            monthlyContributions: sodra.imokuSuma ?? null,
            totalSalaryExpenses:  sodra.atlyginimuIslaidos ?? null,
            vehicleCount:         typeof regitra.rows === 'number' ? regitra.rows : null,
        },
    });

    // ── 2. SodraHistory ───────────────────────────────────────────────────────
    const sodraRows: any[] = sodra.duomenys ?? [];
    for (const row of sodraRows) {
        const month = parseMonth(row.data);
        if (!month) continue;
        await prisma.sodraHistory.upsert({
            where: { companyId_month: { companyId: jarKodas, month } },
            create: {
                companyId:     jarKodas,
                month,
                employees:     row.draustieji ?? 0,
                avgSalary:     row.vidutinisAtlyginimas ?? 0,
                contributions: row.imokuSuma ?? 0,
            },
            update: {
                employees:     row.draustieji ?? 0,
                avgSalary:     row.vidutinisAtlyginimas ?? 0,
                contributions: row.imokuSuma ?? 0,
            },
        });
    }

    // ── 3. ProcurementYear (buyer + supplier) ─────────────────────────────────
    const buyerYears: any[] = sutartys.pirkimaiKasMetus ?? [];
    for (const row of buyerYears) {
        const year = typeof row.metai === 'number' ? row.metai : parseInt(row.metai, 10);
        if (isNaN(year)) continue;
        await prisma.procurementYear.upsert({
            where: { companyId_year: { companyId: jarKodas, year } },
            create: { companyId: jarKodas, year, asBuyerEur: row.suma ?? 0, asSupplierEur: 0 },
            update: { asBuyerEur: row.suma ?? 0 },
        });
    }
    const supplierYears: any[] = sutartys.tiekimaiKasMetus ?? [];
    for (const row of supplierYears) {
        const year = typeof row.metai === 'number' ? row.metai : parseInt(row.metai, 10);
        if (isNaN(year)) continue;
        await prisma.procurementYear.upsert({
            where: { companyId_year: { companyId: jarKodas, year } },
            create: { companyId: jarKodas, year, asBuyerEur: 0, asSupplierEur: row.suma ?? 0 },
            update: { asSupplierEur: row.suma ?? 0 },
        });
    }

    // ── 4. TopCounterparty (entities that bought from this company) ───────────
    const topBuyers: any[] = sutartys.topPirkejai ?? [];
    for (const row of topBuyers) {
        if (!row.kodas) continue;
        await prisma.topCounterparty.upsert({
            where: { companyId_counterpartyJar_role: { companyId: jarKodas, counterpartyJar: String(row.kodas), role: 'buyer' } },
            create: {
                companyId:        jarKodas,
                counterpartyJar:  String(row.kodas),
                counterpartyName: row.pavadinimas ?? '',
                totalEur:         row.suma ?? 0,
                contractCount:    row.kiekis ?? 0,
                role:             'buyer',
            },
            update: {
                counterpartyName: row.pavadinimas ?? '',
                totalEur:         row.suma ?? 0,
                contractCount:    row.kiekis ?? 0,
            },
        });
    }

    // ── 5. CourtRecords ───────────────────────────────────────────────────────
    const cases: any[] = teismo.nuosprendziai ?? [];
    for (const c of cases) {
        if (!c.bylosNumeris) continue;
        const date = parseDate(c.data);
        if (!date) continue;
        await prisma.courtRecord.upsert({
            where: { companyId_caseNumber: { companyId: jarKodas, caseNumber: c.bylosNumeris } },
            create: {
                companyId:     jarKodas,
                caseNumber:    c.bylosNumeris,
                caseType:      c.bylosRusis ?? '',
                date,
                court:         c.teismas ?? '',
                roleInCase:    c.bylojeKaip ?? '',
                citationCount: c.citavimasKitoseBylose ?? 0,
                documentUrl:   c.fileHref ?? null,
            },
            update: {
                caseType:      c.bylosRusis ?? '',
                date,
                court:         c.teismas ?? '',
                roleInCase:    c.bylojeKaip ?? '',
                citationCount: c.citavimasKitoseBylose ?? 0,
                documentUrl:   c.fileHref ?? null,
            },
        });
    }

    console.log(
        `  [${jarKodas}] enriched — ` +
        `sodra: ${sodraRows.length} pts, ` +
        `court: ${cases.length} records, ` +
        `procYear: ${buyerYears.length + supplierYears.length} rows`
    );
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
    const companies = await prisma.company.findMany({ select: { jarKodas: true, name: true } });
    console.log(`Enriching ${companies.length} companies…`);

    for (let i = 0; i < companies.length; i++) {
        const { jarKodas, name } = companies[i];
        console.log(`[${i + 1}/${companies.length}] ${name} (${jarKodas})`);
        await enrichCompany(jarKodas);
        if (i < companies.length - 1) await sleep(DELAY_MS);
    }

    console.log('Done.');
    await prisma.$disconnect();
}

main().catch(async err => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
