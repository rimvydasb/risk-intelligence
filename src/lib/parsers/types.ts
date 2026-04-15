export interface FilterParams {
    /** Only include relationships active within this ISO date range (YYYY-MM-DD) */
    yearFrom?: string;
    yearTo?: string;
    /** Only include contract edges above this value (LT) */
    minContractValue?: number;
}

/** Parsed contract summary scraped from viespirkiai.org contract list HTML */
export interface ContractSummary {
    sutartiesUnikalusID: string;
    name: string;
    fromDate: string | null;
    tillDate: string | null;
    value: number | null;
}
