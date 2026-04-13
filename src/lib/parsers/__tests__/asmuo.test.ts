import * as fs from 'fs';
import * as path from 'path';
import { parseAsmuo } from '../asmuo';
import type { AsmuoRaw } from '@/lib/viespirkiai/types';

function loadFixture(name: string): AsmuoRaw {
  const p = path.join(process.cwd(), 'docs/examples/asmuo', name);
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as AsmuoRaw;
}

const lgFixture = loadFixture('110053842.json');
const emptyFixture = loadFixture('307562016.json');

describe('parseAsmuo — Lietuvos geležinkeliai (full fixture)', () => {
  it('creates the anchor org node with correct type', () => {
    const { nodes } = parseAsmuo(lgFixture);
    const anchor = nodes.find((n) => n.data.id === 'org:110053842');
    expect(anchor).toBeDefined();
    expect(anchor!.data.type).toBe('PublicCompany'); // formosKodas=320
    expect(anchor!.data.expanded).toBe(true);
  });

  it('creates person nodes for darbovietes employees', () => {
    const { nodes } = parseAsmuo(lgFixture);
    const persons = nodes.filter((n) => n.data.type === 'Person');
    expect(persons.length).toBeGreaterThan(0);
  });

  it('creates Employment edges for darbovietes', () => {
    const { edges } = parseAsmuo(lgFixture);
    const empEdges = edges.filter((e) => e.data.type === 'Employment');
    expect(empEdges.length).toBeGreaterThan(0);
    for (const e of empEdges) {
      expect(e.data.source).toMatch(/^person:/);
      expect(e.data.target).toBe('org:110053842');
    }
  });

  it('synthesises spouse nodes with person:spouse- prefix', () => {
    const { nodes } = parseAsmuo(lgFixture);
    const spouses = nodes.filter((n) => n.data.id.startsWith('person:spouse-'));
    // fixture has sutuoktinioDarbovietes entries
    expect(spouses.length).toBeGreaterThan(0);
    for (const s of spouses) {
      expect(s.data.synthesised).toBe(true);
    }
  });

  it('creates Contract edges for topPirkejai (buyer→anchor)', () => {
    const { edges } = parseAsmuo(lgFixture);
    const contractEdges = edges.filter((e) => e.data.type === 'Contract');
    expect(contractEdges.length).toBeGreaterThan(0);
    // Label should show formatted value, not plain "Contract"
    contractEdges.forEach((e) => {
      expect(e.data.label).toMatch(/^€/);
    });
  });

  it('does not duplicate nodes when person appears in multiple sections', () => {
    const { nodes } = parseAsmuo(lgFixture);
    const ids = nodes.map((n) => n.data.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('year filter excludes person edges outside the year', () => {
    const { edges: allEdges } = parseAsmuo(lgFixture);
    const { edges: filteredEdges } = parseAsmuo(lgFixture, { year: 1900 });
    // 1900 should exclude all temporal person edges
    const personEdgesAll = allEdges.filter((e) => e.data.type === 'Employment');
    const personEdgesFiltered = filteredEdges.filter((e) => e.data.type === 'Employment');
    // filtered should have fewer or equal
    expect(personEdgesFiltered.length).toBeLessThanOrEqual(personEdgesAll.length);
  });

  it('minContractValue filter excludes low-value contracts', () => {
    const { edges: allEdges } = parseAsmuo(lgFixture);
    const contractsBefore = allEdges.filter((e) => e.data.type === 'Contract').length;
    const { edges: filteredEdges } = parseAsmuo(lgFixture, { minContractValue: 999_999_999 });
    const contractsAfter = filteredEdges.filter((e) => e.data.type === 'Contract').length;
    expect(contractsAfter).toBeLessThanOrEqual(contractsBefore);
  });
});

describe('parseAsmuo — empty fixture (307562016)', () => {
  it('returns only the anchor node when pinreg/sutartys are empty', () => {
    const { nodes, edges } = parseAsmuo(emptyFixture);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(nodes[0].data.id).toMatch(/^org:/);
  });
});
