export type RiskSeverity = 'critical' | 'high' | 'medium';

export interface RiskFlag {
    id: string;
    score: number;
    severity: RiskSeverity;
    description: string;
}

// All flag IDs — referenced by RiskEngine and UI
export const RISK_FLAG_IDS = {
    CRITICAL_WORKFORCE: 'CRITICAL_WORKFORCE',
    DISPROPORTIONATE_VALUE: 'DISPROPORTIONATE_VALUE',
    FRESHLY_REGISTERED: 'FRESHLY_REGISTERED',
    NON_ADVERTISED_WIN: 'NON_ADVERTISED_WIN',
    NO_SODRA_DATA: 'NO_SODRA_DATA',
    BLACKLISTED: 'BLACKLISTED',
} as const;

export type RiskFlagId = typeof RISK_FLAG_IDS[keyof typeof RISK_FLAG_IDS];
