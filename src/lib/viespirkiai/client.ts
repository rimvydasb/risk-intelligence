import axios from 'axios';
import type { AsmuoRaw, SutartisRaw, PirkamasRaw } from './types';
import { ViespirkiaiError } from './types';

const BASE_URL =
  process.env.VIESPIRKIAI_BASE_URL ?? 'https://viespirkiai.org';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
});

async function get<T>(path: string): Promise<T> {
  try {
    const res = await client.get<T>(path);
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new ViespirkiaiError(
        `GET ${path} failed: ${err.message}`,
        err.response?.status,
      );
    }
    throw new ViespirkiaiError(`GET ${path} failed: ${String(err)}`);
  }
}

export function fetchAsmuo(jarKodas: string): Promise<AsmuoRaw> {
  return get<AsmuoRaw>(`/api/asmuo/${jarKodas}`);
}

export function fetchSutartis(sutartiesUnikalusID: string): Promise<SutartisRaw> {
  return get<SutartisRaw>(`/api/sutartis/${sutartiesUnikalusID}`);
}

export function fetchPirkimas(pirkimoId: string): Promise<PirkamasRaw> {
  return get<PirkamasRaw>(`/api/pirkimas/${pirkimoId}`);
}
