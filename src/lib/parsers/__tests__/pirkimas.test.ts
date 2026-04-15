import * as fs from 'fs';
import * as path from 'path';
import {parsePirkimas} from '../pirkimas';
import type {PirkamasRaw} from '@/lib/viespirkiai/types';

function loadFixture(): PirkamasRaw {
    const p = path.join(process.cwd(), 'docs/examples/viesiejiPirkimai/7346201.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as PirkamasRaw;
}

describe('parsePirkimas', () => {
    const raw = loadFixture();

    it('creates a Tender node with string pirkimoId', () => {
        const {nodes} = parsePirkimas(raw);
        const tender = nodes.find((n) => n.data.type === 'Tender');
        expect(tender).toBeDefined();
        expect(tender!.data.id).toBe('tender:7346201');
    });

    it('creates an org stub node when jarKodas is present', () => {
        const {nodes} = parsePirkimas(raw);
        const orgs = nodes.filter((n) => n.data.type === 'PrivateCompany');
        // fixture has jarKodas=188605295
        expect(orgs.length).toBe(1);
        expect(orgs[0].data.jarKodas).toBe('188605295');
    });

    it('returns no edges (tender graph is node-only)', () => {
        const {edges} = parsePirkimas(raw);
        expect(edges).toHaveLength(0);
    });
});
