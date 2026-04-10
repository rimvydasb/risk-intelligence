import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { RiskEngine } from '@/lib/risk-engine';

const prisma = new PrismaClient();
const ANCHOR_ID = '110053842'; // AB "Lietuvos geležinkeliai"

function parseFilterParams(url: string): { yearFrom: number; yearTo: number; minValue: number } {
    const { searchParams } = new URL(url);
    const currentYear = new Date().getFullYear();
    return {
        yearFrom: Number(searchParams.get('yearFrom')) || 2010,
        yearTo: Number(searchParams.get('yearTo')) || currentYear,
        minValue: Number(searchParams.get('minValue')) || 0,
    };
}

export async function GET(request: Request) {
    try {
        const { yearFrom, yearTo, minValue } = parseFilterParams(request.url);

        // Contract date range
        const signedFrom = new Date(yearFrom, 0, 1);
        const signedTo = new Date(yearTo, 11, 31, 23, 59, 59);

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

        // 5. Add Contracts for the anchor (filtered by year and value)
        const anchorContracts = await prisma.contract.findMany({
            where: {
                supplierId: ANCHOR_ID,
                signedAt: { gte: signedFrom, lte: signedTo },
                value: { gte: minValue },
            },
        });

        // Track which buyer nodes actually have edges (to prune orphans)
        const activeBuyerIds = new Set<string>();

        anchorContracts.forEach(contract => {
            const buyerId = `buyer-${contract.buyerCode}`;
            activeBuyerIds.add(buyerId);

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

        // Prune buyer nodes that have no active contract edges
        const filtered = elements.filter(e =>
            e.data.type !== 'buyer' || activeBuyerIds.has(e.data.id)
        );

        return NextResponse.json(filtered);
    } catch (error) {
        console.error('Initial API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
