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
