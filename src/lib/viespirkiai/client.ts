import axios from 'axios';
import type {AsmuoRaw, SutartisRaw, PirkamasRaw} from './types';
import {ViespirkiaiError} from './types';

const BASE_URL = process.env.VIESPIRKIAI_BASE_URL ?? 'https://viespirkiai.org';

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

export function fetchAsmuo(jarKodas: string): Promise<AsmuoRaw> {
    return get<AsmuoRaw>(`/asmuo/${jarKodas}.json`);
}

export function fetchSutartis(sutartiesUnikalusID: string): Promise<SutartisRaw> {
    return get<SutartisRaw>(`/sutartis/${sutartiesUnikalusID}.json`);
}

export function fetchPirkimas(pirkimoId: string): Promise<PirkamasRaw> {
    return get<PirkamasRaw>(`/pirkimas/${pirkimoId}.json`);
}
