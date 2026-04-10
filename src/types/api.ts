import type { RiskFlag } from './risk';

export interface SodraHistoryPoint {
    month: string;       // ISO date string, first day of month
    employees: number;
    avgSalary: number;
    contributions: number;
}

export interface ProcurementYearRow {
    year: number;
    asBuyerEur: number;
    asSupplierEur: number;
}

export interface TopCounterpartyRow {
    counterpartyJar: string;
    counterpartyName: string;
    totalEur: number;
    contractCount: number;
    role: 'buyer' | 'supplier';
}

export interface CourtRecordRow {
    id: string;
    caseNumber: string;
    caseType: string;
    date: string;       // ISO date string
    court: string;
    roleInCase: string; // "Atsakovas" | "Ieškovas" | "Trečiasis asmuo"
    citationCount: number;
    documentUrl: string | null;
}

export interface CourtSummary {
    total: number;
    asDefendant: number;
    asPlaintiff: number;
    asThirdParty: number;
}

export interface PersonRelationshipRow {
    id: string;
    role: string;
    since: string | null;
    until: string | null;
    person: {
        uid: string;
        fullName: string;
        riskScore: number;
        displayScore: number;
    };
}

export interface ContractRow {
    contractId: string;
    title: string;
    value: number;
    currency: string;
    status: string;
    signedAt: string;
    buyerName: string;
    buyerCode: string;
}

export interface EntityDetailResponse {
    // Core identity
    jarKodas: string;
    name: string;
    normalized: string;
    riskScore: number;
    displayScore: number;
    updatedAt: string;

    // Enrichment — identity (§ Spec Section 1)
    legalForm: string | null;
    address: string | null;
    registeredAt: string | null;
    status: string | null;
    statusSince: string | null;
    dataAsOf: string | null;

    // Enrichment — substance (§ Spec Section 3)
    employeeCount: number | null;
    avgSalary: number | null;
    monthlyContributions: number | null;
    totalSalaryExpenses: number | null;
    vehicleCount: number | null;

    // Risk intelligence
    riskFlags: RiskFlag[];
    substanceRatio: number | null;

    // Time-series data
    sodraHistory: SodraHistoryPoint[];         // last 24 months
    procurementYears: ProcurementYearRow[];    // all years
    topCounterparties: TopCounterpartyRow[];   // top 5

    // Legal exposure
    courtSummary: CourtSummary;
    recentCourtRecords: CourtRecordRow[];      // 10 most recent

    // Relationships
    relationships: PersonRelationshipRow[];

    // Recent contracts
    contracts: ContractRow[];
}
