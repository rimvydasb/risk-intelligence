import { PrismaClient } from '@prisma/client';
import { RiskEngine } from '../src/lib/risk-engine';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Risk Engine & Pathfinding ---');

    try {
        await prisma.$connect();

        // 1. Pick a company to analyze
        const company = await prisma.company.findFirst({
            include: { contracts: true }
        });

        if (!company) {
            console.error('No companies found.');
            return;
        }

        console.log(`Analyzing: ${company.name} (${company.jarKodas})`);

        // 2. Risk Calculation
        await RiskEngine.updateCompanyRisk(company.jarKodas);
        const updatedCompany = await prisma.company.findUnique({
            where: { jarKodas: company.jarKodas }
        });

        console.log(`Updated Risk Score: ${updatedCompany?.riskScore}`);
        console.log(`Updated Display Score: ${updatedCompany?.displayScore}`);

        // 3. Network Connections (Recursive CTE)
        console.log('Fetching network connections (Depth 2)...');
        const connections = (await RiskEngine.findNetworkConnections(company.jarKodas, 2)) as any[];
        console.log(`Found ${connections.length} unique nodes in the network path.`);

        // 4. Verification of UC-02 (Shell Anomaly)
        // Find a company with a high-value contract (> 500k)
        const shellCandidate = await prisma.company.findFirst({
            where: {
                contracts: {
                    some: {
                        value: { gt: 500000 }
                    }
                }
            }
        });

        if (shellCandidate) {
            console.log(`\nVerifying UC-02 for: ${shellCandidate.name}`);
            await RiskEngine.updateCompanyRisk(shellCandidate.jarKodas);
            const verified = await prisma.company.findUnique({
                where: { jarKodas: shellCandidate.jarKodas }
            });
            console.log(`Risk Score: ${verified?.riskScore} (Expected > 0)`);
        }

        console.log('--- Verification Complete ---');
    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
