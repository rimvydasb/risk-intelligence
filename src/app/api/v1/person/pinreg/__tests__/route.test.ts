/**
 * @jest-environment node
 */
import {NextRequest} from 'next/server';
import {POST} from '../route';
import * as personExpandModule from '@/lib/graph/personExpand';
import {ViespirkiaiError} from '@/lib/viespirkiai/types';

jest.mock('@/lib/graph/personExpand');
const mockExpandPerson = personExpandModule.expandPerson as jest.Mock;

function makeRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/v1/person/pinreg', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
    });
}

const MOCK_ELEMENTS = {
    nodes: [{data: {id: 'org:302913276', label: 'CPO LT', type: 'PrivateCompany', expanded: false}}],
    edges: [{data: {id: 'edge:person:abc:org:302913276:Official', source: 'person:abc', target: 'org:302913276', type: 'Official'}}],
};

describe('POST /api/v1/person/pinreg', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 200 with elements for valid request', async () => {
        mockExpandPerson.mockResolvedValueOnce(MOCK_ELEMENTS);
        const res = await POST(makeRequest({vardas: 'ROBERTAS VYŠNIAUSKAS', personId: 'person:abc-123'}));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.elements.nodes).toHaveLength(1);
        expect(json.elements.nodes[0].data.id).toBe('org:302913276');
    });

    it('calls expandPerson with trimmed vardas and personId', async () => {
        mockExpandPerson.mockResolvedValueOnce(MOCK_ELEMENTS);
        await POST(makeRequest({vardas: '  ROBERTAS VYŠNIAUSKAS  ', personId: 'person:abc-123'}));
        expect(mockExpandPerson).toHaveBeenCalledWith('ROBERTAS VYŠNIAUSKAS', 'person:abc-123');
    });

    it('returns 400 when vardas is missing', async () => {
        const res = await POST(makeRequest({personId: 'person:abc'}));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_VARDAS');
    });

    it('returns 400 when vardas is empty string', async () => {
        const res = await POST(makeRequest({vardas: '   ', personId: 'person:abc'}));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_VARDAS');
    });

    it('returns 400 when personId is missing', async () => {
        const res = await POST(makeRequest({vardas: 'JONAS JONAITIS'}));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_PERSON_ID');
    });

    it('returns 400 when personId does not start with person:', async () => {
        const res = await POST(makeRequest({vardas: 'JONAS JONAITIS', personId: 'org:123'}));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_PERSON_ID');
    });

    it('returns 400 for invalid JSON body', async () => {
        const req = new NextRequest('http://localhost/api/v1/person/pinreg', {
            method: 'POST',
            body: 'not-json',
            headers: {'Content-Type': 'application/json'},
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_BODY');
    });

    it('returns 502 when ViespirkiaiError is thrown', async () => {
        mockExpandPerson.mockRejectedValueOnce(new ViespirkiaiError('MCP down', 503));
        const res = await POST(makeRequest({vardas: 'JONAS JONAITIS', personId: 'person:abc'}));
        expect(res.status).toBe(502);
        expect((await res.json()).code).toBe('UPSTREAM_ERROR');
    });

    it('returns 500 for unexpected errors', async () => {
        mockExpandPerson.mockRejectedValueOnce(new Error('something exploded'));
        const res = await POST(makeRequest({vardas: 'JONAS JONAITIS', personId: 'person:abc'}));
        expect(res.status).toBe(500);
        expect((await res.json()).code).toBe('INTERNAL_ERROR');
    });
});
