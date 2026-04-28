import type {McpPinregRaw, McpDarbovieteRaw, McpRysysSuJaRaw} from './types';
import {ViespirkiaiError} from './types';

// ── Raw API response types (actual format returned by viespirkiai.org/mcp) ──
// The real API returns an array of individual declaration records, where each
// record embeds its own darbovietes / rysiaiSuJa / sutuoktinioDarbovietes.
// Field name `jaKodas` (not `jarKodas`) and `pareigos` is an array of objects.

interface RawPareigosItem {
    pareigos?: string | null;
    pareiguTipasPavadinimas?: string;
}

interface RawDarbovieteItem {
    jaKodas?: string;
    pavadinimas?: string;
    rysioPradzia?: string | null;
    darbovietesTipas?: string;
    pareigos?: RawPareigosItem[];
}

interface RawRysysSuJaItem {
    jaKodas?: string;
    pavadinimas?: string;
    rysioPradzia?: string | null;
    rysioPabaiga?: string | null;
    rysioPobudzioPavadinimas?: string;
}

export interface RawDeclaration {
    uuid?: string;
    teikejas?: {vardas?: string; pavarde?: string};
    darbovietes?: RawDarbovieteItem[];
    rysiaiSuJa?: RawRysysSuJaItem[];
    sutuoktinioDarbovietes?: unknown[];
}

/**
 * Normalize the raw MCP API array response into the canonical McpPinregRaw shape.
 * The API returns an array of individual declaration records; we aggregate their
 * darbovietes / rysiaiSuJa across all records and flatten the pareigos array.
 */
export function normalizeMcpApiResponse(declarations: RawDeclaration[]): McpPinregRaw {
    const darbovietes: McpDarbovieteRaw[] = [];
    const rysiaiSuJa: McpRysysSuJaRaw[] = [];

    for (const decl of declarations) {
        const deklaracija = decl.uuid ?? '';
        const vardas = decl.teikejas?.vardas;
        const pavarde = decl.teikejas?.pavarde;

        for (const d of decl.darbovietes ?? []) {
            if (!d.jaKodas) continue;
            const firstPareigos = d.pareigos?.[0];
            darbovietes.push({
                jarKodas: d.jaKodas,
                deklaracija,
                vardas,
                pavarde,
                pavadinimas: d.pavadinimas,
                rysioPradzia: d.rysioPradzia ?? null,
                darbovietesTipas: d.darbovietesTipas,
                pareigos: firstPareigos?.pareigos ?? null,
                pareiguTipasPavadinimas: firstPareigos?.pareiguTipasPavadinimas,
            });
        }

        for (const r of decl.rysiaiSuJa ?? []) {
            if (!r.jaKodas) continue;
            rysiaiSuJa.push({
                jarKodas: r.jaKodas,
                deklaracija,
                vardas,
                pavarde,
                pavadinimas: r.pavadinimas,
                rysioPradzia: r.rysioPradzia ?? null,
                rysioPabaiga: r.rysioPabaiga ?? null,
                rysioPobudzioPavadinimas: r.rysioPobudzioPavadinimas,
            });
        }
        // sutuoktinioDarbovietes: preserve as-is for now (uncommon, complex structure)
    }

    return {
        darbovietes,
        rysiaiSuJa,
        sutuoktinioDarbovietes: [],
        counts: {
            darbovietes: darbovietes.length,
            rysiaiSuJa: rysiaiSuJa.length,
            sutuoktiniuDarbovietes: 0,
        },
        total: declarations.length,
        limit: declarations.length,
    };
}

const MCP_URL = process.env.VIESPIRKIAI_MCP_URL ?? 'https://viespirkiai.org/mcp';
const MCP_PINREG_LIMIT = 20;

/**
 * Fetch interest-declaration (pinreg) data for a person by full name via the
 * viespirkiai.org MCP endpoint.
 *
 * The endpoint responds as a Server-Sent Events stream. Each relevant line is
 * prefixed with "data:" and contains a JSON-RPC 2.0 response object. We look
 * for the line that carries `result.content[0].text`, parse that text as JSON,
 * and return it as McpPinregRaw.
 */
export async function fetchPinreg(vardas: string): Promise<McpPinregRaw> {
    const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: 'get_pinreg_asmuo',
            arguments: {
                vardas,
                limit: MCP_PINREG_LIMIT,
            },
        },
    });

    let response: Response;
    try {
        response = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
            },
            body,
        });
    } catch (err) {
        throw new ViespirkiaiError(`MCP POST ${MCP_URL} failed: ${String(err)}`);
    }

    if (!response.ok) {
        throw new ViespirkiaiError(
            `MCP POST ${MCP_URL} failed: HTTP ${response.status}`,
            response.status,
        );
    }

    const text = await response.text();
    console.log(`[viespirkiai/mcp] POST ${MCP_URL} vardas="${vardas}" → ${response.status}`);

    return parseMcpSseResponse(text, vardas);
}

/**
 * Parse an MCP SSE response text. Lines starting with "data:" contain
 * JSON-RPC objects. We find the one with result.content[0].text and
 * parse it as McpPinregRaw.
 */
export function parseMcpSseResponse(text: string, vardas: string): McpPinregRaw {
    const dataLines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice('data:'.length).trim());

    for (const line of dataLines) {
        if (!line) continue;
        let outer: unknown;
        try {
            outer = JSON.parse(line);
        } catch {
            continue;
        }
        const result = (outer as Record<string, unknown>)?.result;
        if (!result || typeof result !== 'object') continue;
        const content = (result as Record<string, unknown>).content;
        if (!Array.isArray(content) || content.length === 0) continue;
        const block = content[0] as Record<string, unknown>;
        if (block.type !== 'text' || typeof block.text !== 'string') continue;

        try {
            const parsed: unknown = JSON.parse(block.text);
            // The real API returns an array of raw declaration records; normalize it.
            if (Array.isArray(parsed)) {
                return normalizeMcpApiResponse(parsed as RawDeclaration[]);
            }
            return parsed as McpPinregRaw;
        } catch {
            throw new ViespirkiaiError(
                `MCP response for "${vardas}": failed to parse inner JSON from content[0].text`,
            );
        }
    }

    throw new ViespirkiaiError(
        `MCP response for "${vardas}": no valid result.content[0].text found in SSE stream`,
    );
}
