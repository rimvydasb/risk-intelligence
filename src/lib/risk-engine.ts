import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RiskEngine {
    /**
     * DisplayScore = log2(NodeRiskScore + 1) * 10
     */
    static calculateDisplayScore(riskScore: number): number {
        return Math.log2(riskScore + 1) * 10;
    }

    /**
     * UC-02: Shell Company Detection
     * Flag: High contract value (e.g. > 100k) won within 3 months of registration.
     * Flag: Total contract value / Employee count (if available) - skipping for now.
     */
    static async detectShellAnomalies(companyId: string): Promise<number> {
        // Simplified POC: Check for large contracts shortly after "since" date if we had it,
        // but for now let's just use a high-value threshold for recently created ones.
        const company = await prisma.company.findUnique({
            where: { jarKodas: companyId },
            include: { contracts: true }
        });

        if (!company) return 0;

        let risk = 0;
        for (const contract of company.contracts) {
            if (contract.value > 500000) {
                risk += 50; // High value flag
            }
        }
        return risk;
    }

    /**
     * Calculation on Write (CoW) entry point.
     * Updates the riskScore and displayScore for a company.
     */
    static async updateCompanyRisk(companyId: string): Promise<void> {
        const shellRisk = await this.detectShellAnomalies(companyId);
        
        // Multi-hop Pathfinding Risk (POC: Check for connections to high-risk persons)
        // This would use the Recursive CTEs in the future.
        const baseRisk = shellRisk; 

        const displayScore = this.calculateDisplayScore(baseRisk);

        await prisma.company.update({
            where: { jarKodas: companyId },
            data: {
                riskScore: baseRisk,
                displayScore: displayScore
            }
        });
    }

    /**
     * Recursive CTE POC for multi-hop pathfinding.
     * Finds all companies connected to a starting company through shared owners/persons up to N hops.
     */
    static async findNetworkConnections(companyId: string, depth: number = 3) {
        // Since Prisma doesn't support recursive CTEs directly in its fluent API,
        // we use raw SQL as specified in the RAGp model.
        const query = `
            WITH RECURSIVE NetworkPath AS (
                -- Anchor: Initial Relationships for the starting company
                SELECT 
                    pr."companyId", 
                    pr."personId", 
                    pr.role, 
                    1 as depth
                FROM "PersonRelationship" pr
                WHERE pr."companyId" = '${companyId}'

                UNION ALL

                -- Recursive Step: Find other companies owned by the same person, 
                -- and then other persons in those companies.
                SELECT 
                    pr2."companyId", 
                    pr2."personId", 
                    pr2.role,
                    np.depth + 1
                FROM "PersonRelationship" pr2
                INNER JOIN NetworkPath np ON (np."personId" = pr2."personId" OR np."companyId" = pr2."companyId")
                WHERE np.depth < ${depth}
                  AND (pr2."companyId" != np."companyId" OR pr2."personId" != np."personId")
            )
            SELECT DISTINCT * FROM NetworkPath;
        `;

        return await prisma.$queryRawUnsafe(query);
    }
}
