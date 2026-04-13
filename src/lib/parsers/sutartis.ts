import type { SutartisRaw } from '@/lib/viespirkiai/types';
import type { CytoscapeElements, CytoscapeNode, CytoscapeEdge } from '@/types/graph';

export function parseSutartis(raw: SutartisRaw): CytoscapeElements {
  const nodes: CytoscapeNode[] = [];
  const edges: CytoscapeEdge[] = [];

  const contractId = `contract:${raw.sutartiesUnikalusID}`;
  const buyerCode = raw.perkanciosiosOrganizacijosKodas;
  const supplierCode = raw.tiekejoKodas;

  if (buyerCode) {
    nodes.push({
      data: {
        id: `org:${buyerCode}`,
        label: raw.perkanciojiOrganizacija ?? buyerCode,
        type: 'PrivateCompany',
        jarKodas: buyerCode,
        expanded: false,
      },
    });
  }

  if (supplierCode) {
    nodes.push({
      data: {
        id: `org:${supplierCode}`,
        label: raw.tiekejas ?? supplierCode,
        type: 'PrivateCompany',
        jarKodas: supplierCode,
        expanded: false,
      },
    });
  }

  nodes.push({
    data: {
      id: contractId,
      label: raw.pavadinimas ?? raw.sutartiesUnikalusID,
      type: 'Contract',
      contractId: raw.sutartiesUnikalusID,
      value: raw.verte ?? null,
      signedDate: raw.paskelbimoData ?? null,
      expiryDate: raw.galiojimoData ?? null,
    },
  });

  if (buyerCode) {
    edges.push({
      data: {
        id: `edge:org:${buyerCode}:${contractId}:Signed`,
        source: `org:${buyerCode}`,
        target: contractId,
        type: 'Signed',
        label: 'Buyer',
      },
    });
  }

  if (supplierCode) {
    edges.push({
      data: {
        id: `edge:org:${supplierCode}:${contractId}:Signed`,
        source: `org:${supplierCode}`,
        target: contractId,
        type: 'Signed',
        label: 'Supplier',
      },
    });
  }

  return { nodes, edges };
}
