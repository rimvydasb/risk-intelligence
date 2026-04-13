/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as entityModule from '@/lib/graph/entity';

jest.mock('@/lib/graph/entity');
const mockGetEntityDetail = entityModule.getEntityDetail as jest.Mock;

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

const MOCK_ENTITY = {
  id: 'org:110053842',
  type: 'Organisation',
  label: 'Lietuvos geležinkeliai',
  data: {},
};

describe('GET /api/v1/entity/[entityId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with entity detail for valid org entityId', async () => {
    mockGetEntityDetail.mockResolvedValueOnce(MOCK_ENTITY);
    const res = await GET(makeRequest('http://localhost/api/v1/entity/org:110053842'), {
      params: Promise.resolve({ entityId: 'org:110053842' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.label).toBe('Lietuvos geležinkeliai');
  });

  it('returns 400 for unknown entityId prefix', async () => {
    const res = await GET(makeRequest('http://localhost/api/v1/entity/unknown:123'), {
      params: Promise.resolve({ entityId: 'unknown:123' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_ENTITY_ID');
  });

  it('returns 404 when entity not found', async () => {
    mockGetEntityDetail.mockResolvedValueOnce(null);
    const res = await GET(makeRequest('http://localhost/api/v1/entity/org:000000000'), {
      params: Promise.resolve({ entityId: 'org:000000000' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('NOT_FOUND');
  });

  it('returns 500 for unexpected errors', async () => {
    mockGetEntityDetail.mockRejectedValueOnce(new Error('db crash'));
    const res = await GET(makeRequest('http://localhost/api/v1/entity/org:110053842'), {
      params: Promise.resolve({ entityId: 'org:110053842' }),
    });
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('INTERNAL_ERROR');
  });

  it('accepts person: prefix', async () => {
    mockGetEntityDetail.mockResolvedValueOnce({
      id: 'person:abc-123',
      type: 'Person',
      label: 'John',
      data: {},
    });
    const res = await GET(makeRequest('http://localhost/api/v1/entity/person:abc-123'), {
      params: Promise.resolve({ entityId: 'person:abc-123' }),
    });
    expect(res.status).toBe(200);
  });
});
