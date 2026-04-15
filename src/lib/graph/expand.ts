import { getAsmuo, upsertAsmuo } from '@/lib/staging/asmuo';
import { fetchAsmuo } from '@/lib/viespirkiai/client';
import { parseAsmuo } from '@/lib/parsers/asmuo';
import type { CytoscapeNode } from '@/types/graph';
import type { GraphFilters, ExpandResult } from './types';

const NEZINOMAS_LABELS = new Set(['Nežinomas', 'Nezinomas']);

/** A jarKodas is resolvable when it looks like a real Lithuanian company code (≥ 6 digits). */
export function isResolvableJarKodas(jarKodas: string): boolean {
  const n = parseInt(jarKodas, 10);
  return !isNaN(n) && n >= 100_000;
}

/** Fetch the real name for a stub org node that has "Nežinomas" as its label. */
async function enrichStubNode(node: CytoscapeNode): Promise<void> {
  const jarKodas = node.data.jarKodas as string | undefined;
  if (!jarKodas || !isResolvableJarKodas(jarKodas)) return;

  let entry = await getAsmuo(jarKodas);
  if (!entry) {
    const raw = await fetchAsmuo(jarKodas);
    await upsertAsmuo(jarKodas, raw);
    entry = { data: raw, fetchedAt: new Date() };
  }

  const realName = entry.data.jar?.pavadinimas;
  if (realName) {
    node.data.label = realName;
  }
}

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

  // Enrich stub org nodes whose name the API returned as "Nežinomas".
  const stubsToEnrich = elements.nodes.filter(
    (n) => n.data.expanded === false && NEZINOMAS_LABELS.has(n.data.label as string),
  );
  await Promise.all(stubsToEnrich.map(enrichStubNode));

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
