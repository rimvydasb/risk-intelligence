import { PrismaClient } from '@prisma/client';
import type { RiskFlag } from '@/types/risk';

const prisma = new PrismaClient();

// Six months in milliseconds — used for FRESHLY_REGISTERED flag
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export class RiskEngine {
    /**
     * DisplayScore = log2(riskScore + 1) * 10
     * Maps raw additive integer scores to a bounded display range.
     */
    static calculateDisplayScore(riskScore: number): number {
        return Math.log2(riskScore + 1) * 10;
    }

    /**
     * Returns all active risk flags for a company.
     * Each flag carries its score contribution and severity.
     * Scores are additive — sum all active flag scores for the total riskScore.
     */
    static async getRiskFlags(companyId: string): Promise<RiskFlag[]> {
        const company = await prisma.company.findUnique({
            where: { jarKodas: companyId },
            include: {
                contracts: { orderBy: { signedAt: 'asc' } },
                sodraHistory: { take: 1 },
            },
        });

        if (!company) return [];

        const flags: RiskFlag[] = [];
        const totalContractValue = company.contracts.reduce((sum, c) => sum + c.value, 0);

        // UC-02: CRITICAL_WORKFORCE — near-zero workforce
        if (company.employeeCount !== null && company.employeeCount < 2) {
            flags.push({
                id: 'CRITICAL_WORKFORCE',
                score: 50,
                severity: 'critical',
                description: `Only ${company.employeeCount} insured employee(s) on record (SODRA).`,
            });
        }

        // UC-02: DISPROPORTIONATE_VALUE — high contracts, minimal workforce
        if (
            company.employeeCount !== null &&
            company.employeeCount < 5 &&
            totalContractValue > 500_000
        ) {
            flags.push({
                id: 'DISPROPORTIONATE_VALUE',
                score: 30,
                severity: 'high',
                description: `${company.employeeCount} employee(s) yet €${(totalContractValue / 1_000_000).toFixed(1)}M in contracts.`,
            });
        }

        // UC-02: FRESHLY_REGISTERED — registered < 6 months before first contract
        if (company.registeredAt && company.contracts.length > 0) {
            const firstContract = company.contracts[0];
            const ageAtContract = firstContract.signedAt.getTime() - company.registeredAt.getTime();
            if (ageAtContract < SIX_MONTHS_MS) {
                const ageMonths = Math.floor(ageAtContract / (30 * 24 * 60 * 60 * 1000));
                flags.push({
                    id: 'FRESHLY_REGISTERED',
                    score: 80,
                    severity: 'critical',
                    description: `Company was only ${ageMonths} month(s) old when it won its first contract.`,
                });
            }
        }

        // UC-02: NON_ADVERTISED_WIN — contract won without open competition
        const nonAdvertisedKeywords = ['mvp', 'neskelbiamos', 'apklausos'];
        const hasNonAdvertised = company.contracts.some(c =>
            nonAdvertisedKeywords.some(kw => c.status.toLowerCase().includes(kw))
        );
        if (hasNonAdvertised) {
            const count = company.contracts.filter(c =>
                nonAdvertisedKeywords.some(kw => c.status.toLowerCase().includes(kw))
            ).length;
            flags.push({
                id: 'NON_ADVERTISED_WIN',
                score: 80,
                severity: 'critical',
                description: `${count} contract(s) awarded via non-advertised / negotiated procedure.`,
            });
        }

        // UC-02: NO_SODRA_DATA — no Lithuanian employees whatsoever
        if (company.sodraHistory.length === 0 && company.contracts.length > 0) {
            flags.push({
                id: 'NO_SODRA_DATA',
                score: 40,
                severity: 'high',
                description: 'No SODRA (social insurance) records found — likely no Lithuanian employees.',
            });
        }

        // BLACKLISTED — placeholder until blacklist table is added
        // When implemented: query a Blacklist table for this companyId
        const isBlacklisted = false;
        if (isBlacklisted) {
            flags.push({
                id: 'BLACKLISTED',
                score: 100,
                severity: 'critical',
                description: 'Company appears on the VPT supplier blacklist.',
            });
        }

        return flags;
    }

    /**
     * Computes the substance ratio: total contract value divided by estimated annual payroll.
     * Values > 10 indicate the company is winning far more than its payroll could support.
     * Returns null when salary or employee data is unavailable.
     */
    static async getSubstanceRatio(companyId: string): Promise<number | null> {
        const company = await prisma.company.findUnique({
            where: { jarKodas: companyId },
            include: { contracts: true },
        });

        if (!company || !company.employeeCount || !company.avgSalary) return null;
        const annualPayroll = company.employeeCount * company.avgSalary * 12;
        if (annualPayroll === 0) return null;

        const totalContractValue = company.contracts.reduce((sum, c) => sum + c.value, 0);
        return totalContractValue / annualPayroll;
    }

    /**
     * Calculation on Write (CoW) entry point.
     * Recomputes riskScore and displayScore from all active flags and persists them.
     */
    static async updateCompanyRisk(companyId: string): Promise<void> {
        const flags = await this.getRiskFlags(companyId);
        const riskScore = flags.reduce((sum, f) => sum + f.score, 0);
        const displayScore = this.calculateDisplayScore(riskScore);

        await prisma.company.update({
            where: { jarKodas: companyId },
            data: { riskScore, displayScore },
        });
    }

    /**
     * Recursive CTE — multi-hop network traversal via shared ownership/management links.
     * Uses raw SQL because Prisma's fluent API does not support WITH RECURSIVE.
     * See ARCHITECTURE.md §12.2.
     */
    static async findNetworkConnections(companyId: string, depth: number = 3) {
        const query = `
            WITH RECURSIVE NetworkPath AS (
                SELECT
                    pr."companyId",
                    pr."personId",
                    pr.role,
                    1 as depth
                FROM "PersonRelationship" pr
                WHERE pr."companyId" = '${companyId}'

                UNION ALL

                SELECT
                    pr2."companyId",
                    pr2."personId",
                    pr2.role,
                    np.depth + 1
                FROM "PersonRelationship" pr2
                INNER JOIN NetworkPath np
                    ON (np."personId" = pr2."personId" OR np."companyId" = pr2."companyId")
                WHERE np.depth < ${depth}
                  AND (pr2."companyId" != np."companyId" OR pr2."personId" != np."personId")
            )
            SELECT DISTINCT * FROM NetworkPath;
        `;

        return await prisma.$queryRawUnsafe(query);
    }
}
