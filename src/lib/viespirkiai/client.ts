import axios from 'axios';
import type {AsmuoRaw, SutartisRaw, PirkamasRaw} from './types';
import {ViespirkiaiError} from './types';
import type {ContractSummary} from '@/lib/parsers/types';

const BASE_URL = process.env.VIESPIRKIAI_BASE_URL ?? 'https://viespirkiai.org';

const MAX_PAGES = 20;

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15_000,
});

async function get<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;
    try {
        const res = await client.get<T>(path);
        console.log(`[viespirkiai] GET ${url} → ${res.status}`);
        return res.data;
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            const status = err.response?.status ?? 'no-response';
            console.error(`[viespirkiai] GET ${url} failed — HTTP ${status}: ${err.message}`);
            throw new ViespirkiaiError(`GET ${url} failed: HTTP ${status} — ${err.message}`, err.response?.status);
        }
        console.error(`[viespirkiai] GET ${url} failed — unexpected error:`, err);
        throw new ViespirkiaiError(`GET ${url} failed: ${String(err)}`);
    }
}

async function getHtml(path: string): Promise<string> {
    const url = `${BASE_URL}${path}`;
    try {
        const res = await client.get<string>(path, {responseType: 'text'});
        console.log(`[viespirkiai] GET ${url} → ${res.status}`);
        return res.data;
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            const status = err.response?.status ?? 'no-response';
            console.error(`[viespirkiai] GET ${url} failed — HTTP ${status}: ${err.message}`);
            throw new ViespirkiaiError(`GET ${url} failed: HTTP ${status} — ${err.message}`, err.response?.status);
        }
        console.error(`[viespirkiai] GET ${url} failed — unexpected error:`, err);
        throw new ViespirkiaiError(`GET ${url} failed: ${String(err)}`);
    }
}

/** Parse Lithuanian currency string like "12 110,89 €" → number */
function parseLtValue(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace('€', '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

/** Parse one page of HTML contract list articles into ContractSummary[]. Returns [] when no articles found. */
function parseContractArticles(html: string): ContractSummary[] {
    const results: ContractSummary[] = [];
    // Match each result-card article block
    const articleRe = /<article[^>]*class="[^"]*result-card[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let articleMatch: RegExpExecArray | null;
    while ((articleMatch = articleRe.exec(html)) !== null) {
        const body = articleMatch[1];

        // Contract ID from href="/sutartis/{id}"
        const idMatch = /href="\/sutartis\/([^"]+)"/.exec(body);
        if (!idMatch) continue;
        const sutartiesUnikalusID = idMatch[1];

        // Name from <h3> or first heading-like element
        const nameMatch = /<(?:h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/.exec(body);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Dates from <time datetime="…"> elements (first = fromDate, second = tillDate)
        const timeRe = /<time[^>]*datetime="([^"]*)"[^>]*>/g;
        const times: string[] = [];
        let timeMatch: RegExpExecArray | null;
        while ((timeMatch = timeRe.exec(body)) !== null) {
            times.push(timeMatch[1]);
        }
        const fromDate = times[0] ?? null;
        const tillDate = times[1] ?? null;

        // Value from <span class="amount">…</span>
        const amountMatch = /<span[^>]*class="[^"]*amount[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(body);
        const value = amountMatch ? parseLtValue(amountMatch[1].replace(/<[^>]+>/g, '').trim()) : null;

        results.push({sutartiesUnikalusID, name, fromDate, tillDate, value});
    }
    return results;
}

/**
 * Fetch all contracts between a buyer and supplier from viespirkiai.org HTML pages.
 * Walks pages until an empty page is found or MAX_PAGES is reached.
 */
export async function fetchSutartisList(buyerCode: string, supplierCode: string): Promise<ContractSummary[]> {
    const all: ContractSummary[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const query = `perkanciosiosOrganizacijosKodas=${buyerCode}&tiekejoKodas=${supplierCode}&page=${page}`;
        const html = await getHtml(`/?${query}`);
        const articles = parseContractArticles(html);
        if (articles.length === 0) break;
        all.push(...articles);
        if (articles.length < 50) break; // last page (full pages have 50)
    }
    return all;
}

export function fetchAsmuo(jarKodas: string): Promise<AsmuoRaw> {
    return get<AsmuoRaw>(`/asmuo/${jarKodas}.json`);
}

export function fetchSutartis(sutartiesUnikalusID: string): Promise<SutartisRaw> {
    return get<SutartisRaw>(`/sutartis/${sutartiesUnikalusID}.json`);
}

export function fetchPirkimas(pirkimoId: string): Promise<PirkamasRaw> {
    return get<PirkamasRaw>(`/pirkimas/${pirkimoId}.json`);
}
