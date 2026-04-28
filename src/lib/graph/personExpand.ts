import {getPinreg, upsertPinreg} from '@/lib/staging/pinreg';
import {fetchPinreg} from '@/lib/viespirkiai/mcpClient';
import {parsePinreg} from '@/lib/parsers/pinreg';
import type {GraphElements} from '@/types/graph';

/**
 * Expand a PersonEntity node by fetching their interest declarations from the
 * viespirkiai.org MCP endpoint (get_pinreg_asmuo).
 *
 * Checks StagingPinreg cache first (TTL 24h). On cache miss, calls the MCP API,
 * stores the raw response, then parses it into GraphElements (org stub nodes +
 * typed relationship edges).
 *
 * @param vardas    Uppercased full name used as the MCP search key, e.g. "ROBERTAS VYŠNIAUSKAS"
 * @param personId  Namespaced person entity ID, e.g. "person:9bf3bd8b-..."
 */
export async function expandPerson(vardas: string, personId: string): Promise<GraphElements> {
    let entry = await getPinreg(vardas);

    if (!entry) {
        const raw = await fetchPinreg(vardas);
        await upsertPinreg(vardas, raw);
        entry = {data: raw, fetchedAt: new Date()};
    }

    return parsePinreg(entry.data, personId);
}
