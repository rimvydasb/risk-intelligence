import { db } from '@/lib/db';
import type { EntityDetailResult } from './types';

export async function getEntityDetail(entityId: string): Promise<EntityDetailResult | null> {
  // ── Organisation lookup ──────────────────────────────────────────────
  if (entityId.startsWith('org:')) {
    const jarKodas = entityId.slice(4);
    const row = await db.stagingAsmuo.findUnique({ where: { jarKodas } });
    if (!row) return null;
    const data = row.data as Record<string, unknown>;
    const jar = (data.jar ?? {}) as Record<string, unknown>;
    return {
      id: entityId,
      type: 'Organisation',
      label: String(jar.pavadinimas ?? jarKodas),
      data,
    };
  }

  // ── Person lookup (JSONB scan) ────────────────────────────────────────
  if (entityId.startsWith('person:')) {
    const rawUuid = entityId.slice(7);

    // Synthesised spouse nodes have no deklaracija — return minimal result
    if (rawUuid.startsWith('spouse-')) {
      return {
        id: entityId,
        type: 'Person',
        label: entityId,
        data: { synthesised: true },
      };
    }

    // Use PostgreSQL JSONB containment operator to find declarations
    type RowResult = { data: Record<string, unknown> };
    const rows = await db.$queryRaw<RowResult[]>`
      SELECT data FROM "StagingAsmuo"
      WHERE data->'pinreg'->'darbovietes' @> ${JSON.stringify([{ deklaracija: rawUuid }])}::jsonb
         OR data->'pinreg'->'sutuoktinioDarbovietes' @> ${JSON.stringify([{ deklaracija: rawUuid }])}::jsonb
         OR data->'pinreg'->'rysiaiSuJa' @> ${JSON.stringify([{ deklaracija: rawUuid }])}::jsonb
      LIMIT 1
    `;

    if (!rows.length) return null;

    const orgData = rows[0].data as Record<string, unknown>;
    const pinreg = (orgData.pinreg ?? {}) as Record<string, unknown[]>;

    const allPersons = [
      ...((pinreg.darbovietes as Array<Record<string, unknown>>) ?? []),
      ...((pinreg.sutuoktinioDarbovietes as Array<Record<string, unknown>>) ?? []),
      ...((pinreg.rysiaiSuJa as Array<Record<string, unknown>>) ?? []),
    ];

    const person = allPersons.find((p) => p.deklaracija === rawUuid);
    if (!person) return null;

    const label =
      [person.vardas, person.pavarde].filter(Boolean).join(' ') ||
      String(person.deklaracija ?? rawUuid);

    return {
      id: entityId,
      type: 'Person',
      label,
      data: person,
    };
  }

  return null;
}
