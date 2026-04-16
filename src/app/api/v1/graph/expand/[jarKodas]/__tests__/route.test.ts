/**
 * @jest-environment node
 */
import {NextRequest} from 'next/server';
import {GET} from '../route';
import * as expandModule from '@/lib/graph/expand';
import {ViespirkiaiError} from '@/lib/viespirkiai/types';

jest.mock('@/lib/graph/expand');
const mockExpandOrg = expandModule.expandOrg as jest.Mock;

function makeRequest(url: string): NextRequest {
    return new NextRequest(url);
}

const MOCK_RESULT = {
    elements: {nodes: [{data: {id: 'org:110053842'}}], edges: []},
    meta: {anchorId: 'org:110053842', totalNodes: 1, totalEdges: 0, generatedAt: '', cached: false},
};

describe('GET /api/v1/graph/expand/[jarKodas]', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 200 with expand result for valid jarKodas', async () => {
        mockExpandOrg.mockResolvedValueOnce(MOCK_RESULT);
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/110053842'), {
            params: Promise.resolve({jarKodas: '110053842'}),
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.meta.anchorId).toBe('org:110053842');
    });

    it('returns 400 for non-numeric jarKodas', async () => {
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/abc'), {
            params: Promise.resolve({jarKodas: 'abc'}),
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe('INVALID_JAR_KODAS');
    });

    it('returns 400 for invalid yearFrom param', async () => {
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/110053842?yearFrom=notadate'), {
            params: Promise.resolve({jarKodas: '110053842'}),
        });
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_YEAR_FROM');
    });

    it('returns 400 for invalid yearTo param', async () => {
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/110053842?yearTo=notadate'), {
            params: Promise.resolve({jarKodas: '110053842'}),
        });
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('INVALID_YEAR_TO');
    });

    it('passes filters to expandOrg', async () => {
        mockExpandOrg.mockResolvedValueOnce(MOCK_RESULT);
        await GET(
            makeRequest(
                'http://localhost/api/v1/graph/expand/110053842?yearFrom=2022-01-01&yearTo=2022-12-31&minContractValue=5000',
            ),
            {params: Promise.resolve({jarKodas: '110053842'})},
        );
        expect(mockExpandOrg).toHaveBeenCalledWith('110053842', {
            yearFrom: '2022-01-01',
            yearTo: '2022-12-31',
            minContractValue: 5000,
        });
    });

    it('returns 502 when ViespirkiaiError is thrown', async () => {
        mockExpandOrg.mockRejectedValueOnce(new ViespirkiaiError('upstream down', 503));
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/110053842'), {
            params: Promise.resolve({jarKodas: '110053842'}),
        });
        expect(res.status).toBe(502);
        expect((await res.json()).code).toBe('UPSTREAM_ERROR');
    });

    it('returns 500 for unexpected errors', async () => {
        mockExpandOrg.mockRejectedValueOnce(new Error('db crash'));
        const res = await GET(makeRequest('http://localhost/api/v1/graph/expand/110053842'), {
            params: Promise.resolve({jarKodas: '110053842'}),
        });
        expect(res.status).toBe(500);
        expect((await res.json()).code).toBe('INTERNAL_ERROR');
    });
});
