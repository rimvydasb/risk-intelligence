export class ViespirkiaiError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'ViespirkiaiError';
    }
}

// ─── Asmuo (organisation + person registry) ───────────────────────────────

export interface JarRaw {
    jarKodas: number;
    pavadinimas: string;
    formosKodas?: number;
    statusas?: string;
    registravimoData?: string;
    adresas?: string;
}

export interface SodraRaw {
    draustieji?: number;
    vidutinisAtlyginimas?: number;
}

export interface DarbovieteRaw {
    /** Person UUID — also stored at `.uuid` within the record */
    deklaracija: string;
    uuid: string;
    vardas?: string;
    pavarde?: string;
    pareigos?: string;
    nuo?: string;
    iki?: string | null;
}

export interface RysisSuJaRaw {
    deklaracija: string;
    uuid: string;
    vardas?: string;
    pavarde?: string;
    rysioPradzia?: string | null;
    rysioPabaiga?: string | null;
    rysioTipas?: string;
}

export interface PinregRaw {
    darbovietes?: DarbovieteRaw[];
    /** Spouse/partner declarations; `deklaracija` is the declarant UUID */
    sutuoktinioDarbovietes?: DarbovieteRaw[];
    rysiaiSuJa?: RysisSuJaRaw[];
}

export interface SutartysRaw {
    pirkimaiKasMetus?: Record<string, number>;
    tiekimaiKasMetus?: Record<string, number>;
    topPirkejai?: Array<{jarKodas: string; pavadinimas?: string; total?: number}>;
    topTiekejai?: Array<{jarKodas: string; pavadinimas?: string; total?: number}>;
}

export interface AsmuoRaw {
    jar?: JarRaw;
    sodra?: SodraRaw;
    pinreg?: PinregRaw;
    sutartys?: SutartysRaw;
}

// ─── Sutartis (individual contract) ──────────────────────────────────────

export interface SutartisRaw {
    sutartiesUnikalusID: string;
    pavadinimas?: string;
    sudarymoData?: string | null;
    galiojimoData?: string | null;
    paskelbimoData?: string | null;
    faktineIvykdimoData?: string | null;
    perkanciojiOrganizacija?: string;
    perkanciosiosOrganizacijosKodas?: string;
    tiekejas?: string;
    tiekejoKodas?: string;
    verte?: number | null;
    pirkimoNumeris?: string;
}

// ─── ViesiejiPirkimai (public tender) ────────────────────────────────────

export interface PirkamasRaw {
    pirkimoId: string;
    jarKodas?: string;
    pavadinimas?: string;
    busena?: string;
    paskelbimo?: string | null;
    sutartys?: unknown[];
}

// ─── MCP Pinreg (interest declarations via viespirkiai.org/mcp) ──────────
// These types represent the response from the MCP get_pinreg_asmuo tool.
// They differ from PinregRaw (asmuo-embedded) — each record includes the
// organization's jarKodas + pavadinimas and uses full Lithuanian field names.

export interface McpDarbovieteRaw {
    jarKodas: string;
    deklaracija: string;
    vardas?: string;
    pavarde?: string;
    pavadinimas?: string;
    rysioPradzia?: string | null;
    darbovietesTipas?: string;
    pareiguTipasPavadinimas?: string;
    pareigos?: string | null;
}

export interface McpRysysSuJaRaw {
    jarKodas: string;
    deklaracija: string;
    pavadinimas?: string;
    rysioPradzia?: string | null;
    rysioPabaiga?: string | null;
    rysioPobudzioPavadinimas?: string;
    vardas?: string;
    pavarde?: string;
}

export interface McpSutuoktiniesDarbovieteRaw {
    jarKodas: string;
    deklaracija: string;
    pavadinimas?: string;
    rysioPradzia?: string | null;
    rysioPabaiga?: string | null;
    /** Declarant first name */
    vardas?: string;
    /** Declarant last name */
    pavarde?: string;
    /** Spouse first name */
    sutuoktinioVardas?: string;
    /** Spouse last name */
    sutuoktinioPavarde?: string;
    pareiguTipasPavadinimas?: string;
}

export interface McpPinregRaw {
    darbovietes?: McpDarbovieteRaw[];
    rysiaiSuJa?: McpRysysSuJaRaw[];
    sutuoktinioDarbovietes?: McpSutuoktiniesDarbovieteRaw[];
    counts?: {
        darbovietes: number;
        rysiaiSuJa: number;
        sutuoktiniuDarbovietes: number;
    };
    total?: number;
    limit?: number;
}

// ─── Asmuo (organisation + person registry) ───────────────────────────────

export interface JarRaw {
    jarKodas: number;
    pavadinimas: string;
    formosKodas?: number;
    statusas?: string;
    registravimoData?: string;
    adresas?: string;
}

export interface SodraRaw {
    draustieji?: number;
    vidutinisAtlyginimas?: number;
}

export interface DarbovieteRaw {
    /** Person UUID — also stored at `.uuid` within the record */
    deklaracija: string;
    uuid: string;
    vardas?: string;
    pavarde?: string;
    pareigos?: string;
    nuo?: string;
    iki?: string | null;
}

export interface RysisSuJaRaw {
    deklaracija: string;
    uuid: string;
    vardas?: string;
    pavarde?: string;
    rysioPradzia?: string | null;
    rysioPabaiga?: string | null;
    rysioTipas?: string;
}

export interface PinregRaw {
    darbovietes?: DarbovieteRaw[];
    /** Spouse/partner declarations; `deklaracija` is the declarant UUID */
    sutuoktinioDarbovietes?: DarbovieteRaw[];
    rysiaiSuJa?: RysisSuJaRaw[];
}

export interface SutartysRaw {
    pirkimaiKasMetus?: Record<string, number>;
    tiekimaiKasMetus?: Record<string, number>;
    topPirkejai?: Array<{jarKodas: string; pavadinimas?: string; total?: number}>;
    topTiekejai?: Array<{jarKodas: string; pavadinimas?: string; total?: number}>;
}

export interface AsmuoRaw {
    jar?: JarRaw;
    sodra?: SodraRaw;
    pinreg?: PinregRaw;
    sutartys?: SutartysRaw;
}

// ─── Sutartis (individual contract) ──────────────────────────────────────

export interface SutartisRaw {
    sutartiesUnikalusID: string;
    pavadinimas?: string;
    sudarymoData?: string | null;
    galiojimoData?: string | null;
    paskelbimoData?: string | null;
    faktineIvykdimoData?: string | null;
    perkanciojiOrganizacija?: string;
    perkanciosiosOrganizacijosKodas?: string;
    tiekejas?: string;
    tiekejoKodas?: string;
    verte?: number | null;
    pirkimoNumeris?: string;
}

// ─── ViesiejiPirkimai (public tender) ────────────────────────────────────

export interface PirkamasRaw {
    pirkimoId: string;
    jarKodas?: string;
    pavadinimas?: string;
    busena?: string;
    paskelbimo?: string | null;
    sutartys?: unknown[];
}
