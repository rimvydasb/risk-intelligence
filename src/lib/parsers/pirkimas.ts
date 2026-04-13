import type { PirkamasRaw } from '@/lib/viespirkiai/types';
import type { CytoscapeElements, CytoscapeNode } from '@/types/graph';

export function parsePirkimas(raw: PirkamasRaw): CytoscapeElements {
  const nodes: CytoscapeNode[] = [];

  nodes.push({
    data: {
      id: `tender:${raw.pirkimoId}`,
      label: raw.pavadinimas ?? raw.pirkimoId,
      type: 'Tender',
      pirkimoId: raw.pirkimoId,
      jarKodas: raw.jarKodas ?? null,
      status: raw.busena ?? null,
      publishedAt: raw.paskelbimo ?? null,
    },
  });

  if (raw.jarKodas) {
    nodes.push({
      data: {
        id: `org:${raw.jarKodas}`,
        label: raw.jarKodas,
        type: 'PrivateCompany',
        jarKodas: raw.jarKodas,
        expanded: false,
      },
    });
  }

  return { nodes, edges: [] };
}
