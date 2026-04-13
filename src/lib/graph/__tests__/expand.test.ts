/**
 * @jest-environment node
 */
import { db } from '@/lib/db';
import { expandOrg } from '../expand';
import * as viespirkiai from '@/lib/viespirkiai/client';
import * as fs from 'fs';
import * as path from 'path';
import type { AsmuoRaw } from '@/lib/viespirkiai/types';

jest.mock('@/lib/viespirkiai/client');
const mockFetchAsmuo = viespirkiai.fetchAsmuo as jest.Mock;

function loadFixture(): AsmuoRaw {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'docs/examples/asmuo/110053842.json'), 'utf-8'),
  ) as AsmuoRaw;
}

beforeEach(async () => {
  await db.stagingAsmuo.deleteMany();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('graph/expand — expandOrg', () => {
  it('fetches from viespirkiai when staging cache is empty', async () => {
    const fixture = loadFixture();
    mockFetchAsmuo.mockResolvedValueOnce(fixture);

    const result = await expandOrg('110053842');
    expect(mockFetchAsmuo).toHaveBeenCalledWith('110053842');
    expect(result.meta.cached).toBe(false);
    expect(result.elements.nodes.length).toBeGreaterThan(0);
    expect(result.meta.anchorId).toBe('org:110053842');
  });

  it('uses cached staging data when fresh', async () => {
    const fixture = loadFixture();
    // Pre-populate staging
    await db.stagingAsmuo.create({
      data: { jarKodas: '110053842', data: fixture as object, fetchedAt: new Date() },
    });

    const result = await expandOrg('110053842');
    expect(mockFetchAsmuo).not.toHaveBeenCalled();
    expect(result.meta.cached).toBe(true);
  });

  it('refetches when staging entry is stale', async () => {
    const fixture = loadFixture();
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    await db.stagingAsmuo.create({
      data: { jarKodas: '110053842', data: fixture as object, fetchedAt: staleDate },
    });
    mockFetchAsmuo.mockResolvedValueOnce(fixture);

    const result = await expandOrg('110053842');
    expect(mockFetchAsmuo).toHaveBeenCalledTimes(1);
    expect(result.meta.cached).toBe(false);
  });

  it('returns correct node/edge counts', async () => {
    const fixture = loadFixture();
    mockFetchAsmuo.mockResolvedValueOnce(fixture);

    const result = await expandOrg('110053842');
    expect(result.meta.totalNodes).toBe(result.elements.nodes.length);
    expect(result.meta.totalEdges).toBe(result.elements.edges.length);
  });
});
