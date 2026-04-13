import { getAsmuo, upsertAsmuo } from '@/lib/staging/asmuo';
import { fetchAsmuo } from '@/lib/viespirkiai/client';
import { parseAsmuo } from '@/lib/parsers/asmuo';
import type { GraphFilters, ExpandResult } from './types';

export async function expandOrg(jarKodas: string, filters?: GraphFilters): Promise<ExpandResult> {
  const anchorId = `org:${jarKodas}`;

  let cached = true;
  let entry = await getAsmuo(jarKodas);

  if (!entry) {
    cached = false;
    const raw = await fetchAsmuo(jarKodas);
    await upsertAsmuo(jarKodas, raw);
    entry = { data: raw, fetchedAt: new Date() };
  }

  const elements = parseAsmuo(entry.data, filters);

  return {
    elements,
    meta: {
      anchorId,
      totalNodes: elements.nodes.length,
      totalEdges: elements.edges.length,
      generatedAt: new Date().toISOString(),
      cached,
    },
  };
}
