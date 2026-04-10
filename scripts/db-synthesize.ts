import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const NUM_COMPANIES = 1000;
const NUM_PERSONS = 500;
const NUM_CONTRACTS = 5000;

async function main() {
    console.log('--- Starting Data Synthesis ---');

    try {
        await prisma.$connect();

        // 1. Generate Persons
        console.log(`Generating ${NUM_PERSONS} persons...`);
        const personData = Array.from({ length: NUM_PERSONS }).map(() => {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const fullName = `${firstName} ${lastName}`;
            return {
                uid: faker.string.uuid().slice(0, 16),
                fullName,
                normalized: fullName.toUpperCase(),
            };
        });

        await prisma.person.createMany({
            data: personData,
            skipDuplicates: true,
        });

        const allPersons = await prisma.person.findMany({ select: { uid: true } });
        const personIds = allPersons.map(p => p.uid);

        // 2. Generate Companies
        console.log(`Generating ${NUM_COMPANIES} companies...`);
        const companyData = Array.from({ length: NUM_COMPANIES }).map(() => {
            const name = faker.company.name();
            return {
                jarKodas: faker.string.numeric(9),
                name,
                normalized: name.toUpperCase(),
            };
        });

        await prisma.company.createMany({
            data: companyData,
            skipDuplicates: true,
        });

        const allCompanies = await prisma.company.findMany({ select: { jarKodas: true } });
        const companyIds = allCompanies.map(c => c.jarKodas);

        // 3. Generate Relationships (CEOs, Owners)
        console.log('Generating relationships...');
        const relationships = [];
        for (const companyId of companyIds) {
            // Assign 1-2 persons per company
            const numRels = faker.number.int({ min: 1, max: 2 });
            const selectedPersons = faker.helpers.arrayElements(personIds, numRels);
            
            for (const personId of selectedPersons) {
                relationships.push({
                    personId,
                    companyId,
                    role: faker.helpers.arrayElement(['CEO', 'Owner', 'UBO', 'Board Member']),
                    since: faker.date.past({ years: 10 }),
                });
            }
        }

        await prisma.personRelationship.createMany({
            data: relationships,
            skipDuplicates: true,
        });

        // 4. Generate Contracts
        console.log(`Generating ${NUM_CONTRACTS} contracts...`);
        const contracts = Array.from({ length: NUM_CONTRACTS }).map(() => {
            const supplierId = faker.helpers.arrayElement(companyIds);
            const value = faker.number.float({ min: 1000, max: 1000000, fractionDigits: 2 });
            
            return {
                contractId: faker.string.uuid(),
                title: faker.commerce.productName() + ' Provision',
                value,
                currency: 'EUR',
                status: 'Signed',
                signedAt: faker.date.past({ years: 5 }),
                buyerName: faker.company.name() + ' Municipality',
                buyerCode: faker.string.numeric(9),
                supplierId,
            };
        });

        await prisma.contract.createMany({
            data: contracts,
            skipDuplicates: true,
        });

        console.log('--- Data Synthesis Complete ---');
    } catch (error) {
        console.error('❌ Data synthesis failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
