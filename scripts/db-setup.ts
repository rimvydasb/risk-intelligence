import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const SAMPLE_CONTRACT_URL = 'https://viespirkiai.org/sutartis/2007700250.json';
const SAMPLE_COMPANY_URL = 'https://viespirkiai.org/asmuo/110053842.json';

async function main() {
    console.log('--- Starting Database Setup ---');

    try {
        // 1. Health Check
        await prisma.$connect();
        console.log('✅ Database connection successful.');

        // 2. Fetch Sample Data
        console.log('Fetching sample data...');
        const [contractRes, companyRes] = await Promise.all([
            axios.get(SAMPLE_CONTRACT_URL),
            axios.get(SAMPLE_COMPANY_URL)
        ]);

        const contractData = contractRes.data;
        const companyData = companyRes.data;

        // 3. Seed Company (from asmuo JSON)
        const jar = companyData.jar;
        const company = await prisma.company.upsert({
            where: { jarKodas: String(jar.jarKodas) },
            update: {},
            create: {
                jarKodas: String(jar.jarKodas),
                name: jar.pavadinimas,
                normalized: jar.pavadinimasBase || jar.pavadinimas,
            }
        });
        console.log(`✅ Seeded Company: ${company.name} (${company.jarKodas})`);

        // 4. Seed Contract
        // Note: The sample contract has supplier code "803" (Foreign). 
        // We must handle this by creating a synthetic company if it doesn't exist.
        const supplierCode = String(contractData.tiekejoKodas);
        const supplierName = contractData.tiekejas;

        await prisma.company.upsert({
            where: { jarKodas: supplierCode },
            update: {},
            create: {
                jarKodas: supplierCode,
                name: supplierName,
                normalized: supplierName,
            }
        });

        const contract = await prisma.contract.upsert({
            where: { contractId: String(contractData.dokumentai[0].dok_id) }, // Using dok_id as contractId for now
            update: {},
            create: {
                contractId: String(contractData.dokumentai[0].dok_id),
                title: contractData.pavadinimas,
                value: contractData.verte || 0,
                currency: 'EUR',
                status: 'Signed',
                signedAt: new Date(contractData.sudarymoData),
                buyerName: contractData.perkanciojiOrganizacija,
                buyerCode: contractData.perkanciosiosOrganizacijosKodas,
                supplierId: supplierCode,
            }
        });
        console.log(`✅ Seeded Contract: ${contract.title} (${contract.contractId})`);

        // 5. Seed Persons (from pinreg)
        if (companyData.pinreg && companyData.pinreg.rysiaiSuJa) {
            for (const rel of companyData.pinreg.rysiaiSuJa) {
                const fullName = `${rel.vardas} ${rel.pavarde}`;
                const uid = Buffer.from(fullName).toString('hex').slice(0, 16); // Simple synthetic UID for POC

                const person = await prisma.person.upsert({
                    where: { uid },
                    update: {},
                    create: {
                        uid,
                        fullName,
                        normalized: fullName,
                    }
                });

                await prisma.personRelationship.upsert({
                    where: {
                        personId_companyId_role: {
                            personId: uid,
                            companyId: String(rel.jarKodas),
                            role: rel.rysioPobudzioPavadinimas,
                        }
                    },
                    update: {},
                    create: {
                        personId: uid,
                        companyId: String(rel.jarKodas),
                        role: rel.rysioPobudzioPavadinimas,
                        since: rel.rysioPradzia ? new Date(rel.rysioPradzia) : null,
                    }
                });
                console.log(`✅ Seeded Person & Relationship: ${person.fullName} as ${rel.rysioPobudzioPavadinimas}`);
            }
        }

        console.log('--- Database Setup Complete ---');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
