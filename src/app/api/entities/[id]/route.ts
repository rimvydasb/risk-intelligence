import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { RiskEngine } from '@/lib/risk-engine';
import type { EntityDetailResponse } from '@/types/api';

const prisma = new PrismaClient();

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const company = await prisma.company.findUnique({
            where: { jarKodas: id },
            include: {
                contracts: {
                    orderBy: { signedAt: 'desc' },
                    take: 10,
                },
                relationships: {
                    include: { person: true },
                },
                sodraHistory: {
                    orderBy: { month: 'asc' },
                    take: 24,
                },
                procurementYears: {
                    orderBy: { year: 'asc' },
                },
                topCounterparties: {
                    orderBy: { totalEur: 'desc' },
                    take: 5,
                },
                courtRecords: {
                    orderBy: { date: 'desc' },
                    take: 10,
                },
            },
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Court summary counts
        const courtSummary = {
            total: await prisma.courtRecord.count({ where: { companyId: id } }),
            asDefendant: await prisma.courtRecord.count({ where: { companyId: id, roleInCase: 'Atsakovas' } }),
            asPlaintiff: await prisma.courtRecord.count({ where: { companyId: id, roleInCase: 'Ieškovas' } }),
            asThirdParty: await prisma.courtRecord.count({ where: { companyId: id, roleInCase: 'Trečiasis asmuo' } }),
        };

        const [riskFlags, substanceRatio] = await Promise.all([
            RiskEngine.getRiskFlags(id),
            RiskEngine.getSubstanceRatio(id),
        ]);

        const response: EntityDetailResponse = {
            jarKodas:             company.jarKodas,
            name:                 company.name,
            normalized:           company.normalized,
            riskScore:            company.riskScore,
            displayScore:         company.displayScore,
            updatedAt:            company.updatedAt.toISOString(),

            legalForm:            company.legalForm,
            address:              company.address,
            registeredAt:         company.registeredAt?.toISOString() ?? null,
            status:               company.status,
            statusSince:          company.statusSince?.toISOString() ?? null,
            dataAsOf:             company.dataAsOf?.toISOString() ?? null,

            employeeCount:        company.employeeCount,
            avgSalary:            company.avgSalary,
            monthlyContributions: company.monthlyContributions,
            totalSalaryExpenses:  company.totalSalaryExpenses,
            vehicleCount:         company.vehicleCount,

            riskFlags,
            substanceRatio,

            sodraHistory: company.sodraHistory.map(h => ({
                month:         h.month.toISOString(),
                employees:     h.employees,
                avgSalary:     h.avgSalary,
                contributions: h.contributions,
            })),

            procurementYears: company.procurementYears.map(y => ({
                year:          y.year,
                asBuyerEur:    y.asBuyerEur,
                asSupplierEur: y.asSupplierEur,
            })),

            topCounterparties: company.topCounterparties.map(c => ({
                counterpartyJar:  c.counterpartyJar,
                counterpartyName: c.counterpartyName,
                totalEur:         c.totalEur,
                contractCount:    c.contractCount,
                role:             c.role as 'buyer' | 'supplier',
            })),

            courtSummary,

            recentCourtRecords: company.courtRecords.map(c => ({
                id:            c.id,
                caseNumber:    c.caseNumber,
                caseType:      c.caseType,
                date:          c.date.toISOString(),
                court:         c.court,
                roleInCase:    c.roleInCase,
                citationCount: c.citationCount,
                documentUrl:   c.documentUrl,
            })),

            relationships: company.relationships.map(r => ({
                id:    r.id,
                role:  r.role,
                since: r.since?.toISOString() ?? null,
                until: r.until?.toISOString() ?? null,
                person: {
                    uid:          r.person.uid,
                    fullName:     r.person.fullName,
                    riskScore:    r.person.riskScore,
                    displayScore: r.person.displayScore,
                },
            })),

            contracts: company.contracts.map(c => ({
                contractId: c.contractId,
                title:      c.title,
                value:      c.value,
                currency:   c.currency,
                status:     c.status,
                signedAt:   c.signedAt.toISOString(),
                buyerName:  c.buyerName,
                buyerCode:  c.buyerCode,
            })),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('API Error [/api/entities/[id]]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
