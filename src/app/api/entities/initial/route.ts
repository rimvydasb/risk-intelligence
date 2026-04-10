import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { RiskEngine } from '@/lib/risk-engine';

const prisma = new PrismaClient();
const ANCHOR_ID = '110053842'; // AB "Lietuvos geležinkeliai"

export async function GET() {
    try {
        // 1. Find Network Connections (depth 2)
        const connections = await RiskEngine.findNetworkConnections(ANCHOR_ID, 2) as any[];

        // 2. Extract unique Company and Person IDs
        const companyIds = Array.from(new Set(connections.map(c => c.companyId)));
        const personIds = Array.from(new Set(connections.map(c => c.personId)));

        // 3. Fetch details for all entities
        const [companies, persons] = await Promise.all([
            prisma.company.findMany({ where: { jarKodas: { in: companyIds } } }),
            prisma.person.findMany({ where: { uid: { in: personIds } } }),
        ]);

        const companyMap = new Map(companies.map(c => [c.jarKodas, c]));
        const personMap = new Map(persons.map(p => [p.uid, p]));

        // 4. Format for Cytoscape
        const elements: any[] = [];

        // Add Nodes
        companies.forEach(c => {
            elements.push({
                data: {
                    id: c.jarKodas,
                    label: c.name,
                    type: 'company',
                    risk: c.displayScore,
                }
            });
        });

        persons.forEach(p => {
            elements.push({
                data: {
                    id: p.uid,
                    label: p.fullName,
                    type: 'person',
                    risk: p.displayScore,
                }
            });
        });

        // Add Edges (Relationships)
        connections.forEach((rel, index) => {
            elements.push({
                data: {
                    id: `rel-${index}`,
                    source: rel.personId,
                    target: rel.companyId,
                    label: rel.role,
                }
            });
        });

        // Also add Contracts for the anchor (as edges to Buyers)
        const anchorContracts = await prisma.contract.findMany({
            where: { supplierId: ANCHOR_ID }
        });

        anchorContracts.forEach(contract => {
            // Add Buyer node if not already there (simplified)
            const buyerId = `buyer-${contract.buyerCode}`;
            if (!elements.find(e => e.data.id === buyerId)) {
                elements.push({
                    data: {
                        id: buyerId,
                        label: contract.buyerName,
                        type: 'buyer',
                        risk: 0,
                    }
                });
            }

            elements.push({
                data: {
                    id: contract.contractId,
                    source: ANCHOR_ID,
                    target: buyerId,
                    label: `${Math.round(contract.value / 1000)}k EUR`,
                    type: 'contract',
                }
            });
        });

        return NextResponse.json(elements);
    } catch (error) {
        console.error('Initial API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
