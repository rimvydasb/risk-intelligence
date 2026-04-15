/**
 * @jest-environment node
 */
import {db} from '@/lib/db';
import {getEntityDetail} from '../entity';
import * as fs from 'fs';
import * as path from 'path';
import type {AsmuoRaw} from '@/lib/viespirkiai/types';

function loadFixture(): AsmuoRaw {
    return JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'docs/examples/asmuo/110053842.json'), 'utf-8'),
    ) as AsmuoRaw;
}

beforeEach(async () => {
    await db.stagingAsmuo.deleteMany();
});

afterAll(async () => {
    await db.$disconnect();
});

describe('graph/entity — getEntityDetail', () => {
    it('returns org detail from staging', async () => {
        const fixture = loadFixture();
        await db.stagingAsmuo.create({
            data: {jarKodas: '110053842', data: fixture as object, fetchedAt: new Date()},
        });

        const result = await getEntityDetail('org:110053842');
        expect(result).not.toBeNull();
        expect(result!.type).toBe('Organisation');
        expect(result!.label).toBe('Akcinė bendrovė "Lietuvos geležinkeliai"');
    });

    it('returns null for unknown org', async () => {
        const result = await getEntityDetail('org:000000000');
        expect(result).toBeNull();
    });

    it('returns person detail by deklaracija UUID', async () => {
        const fixture = loadFixture();
        await db.stagingAsmuo.create({
            data: {jarKodas: '110053842', data: fixture as object, fetchedAt: new Date()},
        });

        // Find a known deklaracija from fixture
        const firstPerson = (fixture.pinreg?.darbovietes ?? [])[0];
        if (!firstPerson) return; // skip if fixture has no employees

        const result = await getEntityDetail(`person:${firstPerson.deklaracija}`);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('Person');
    });

    it('returns null for unknown person deklaracija', async () => {
        const result = await getEntityDetail('person:00000000-0000-0000-0000-000000000000');
        expect(result).toBeNull();
    });

    it('returns synthesised spouse node without DB lookup', async () => {
        const result = await getEntityDetail('person:spouse-some-uuid');
        expect(result).not.toBeNull();
        expect(result!.data.synthesised).toBe(true);
    });

    it('returns null for completely unknown entityId prefix', async () => {
        const result = await getEntityDetail('unknown:12345');
        expect(result).toBeNull();
    });
});
