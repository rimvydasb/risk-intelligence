import { NextRequest, NextResponse } from 'next/server';
import { getEntityDetail } from '@/lib/graph/entity';

const ALLOWED_PREFIXES = ['org:', 'person:', 'contract:', 'tender:'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;

  const valid = ALLOWED_PREFIXES.some((p) => entityId.startsWith(p));
  if (!valid) {
    return NextResponse.json(
      {
        error: `Invalid entityId — must start with one of: ${ALLOWED_PREFIXES.join(', ')}`,
        code: 'INVALID_ENTITY_ID',
      },
      { status: 400 },
    );
  }

  try {
    const detail = await getEntityDetail(entityId);
    if (!detail) {
      return NextResponse.json(
        { error: `Entity not found: ${entityId}`, code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error('[entity] unexpected error', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
