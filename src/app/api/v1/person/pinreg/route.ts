import {NextRequest, NextResponse} from 'next/server';
import {expandPerson} from '@/lib/graph/personExpand';
import {ViespirkiaiError} from '@/lib/viespirkiai/types';

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({error: 'Invalid JSON body', code: 'INVALID_BODY'}, {status: 400});
    }

    const {vardas, personId} = (body ?? {}) as Record<string, unknown>;

    if (typeof vardas !== 'string' || !vardas.trim()) {
        return NextResponse.json(
            {error: 'Missing or invalid "vardas" field — expected non-empty string', code: 'INVALID_VARDAS'},
            {status: 400},
        );
    }

    if (typeof personId !== 'string' || !personId.startsWith('person:')) {
        return NextResponse.json(
            {error: 'Missing or invalid "personId" field — expected "person:..." prefixed string', code: 'INVALID_PERSON_ID'},
            {status: 400},
        );
    }

    try {
        const elements = await expandPerson(vardas.trim(), personId);
        return NextResponse.json({elements});
    } catch (err) {
        if (err instanceof ViespirkiaiError) {
            console.error(`[person/pinreg] upstream error for vardas="${vardas}":`, err.message);
            return NextResponse.json(
                {error: 'Upstream data source error', detail: err.message, code: 'UPSTREAM_ERROR'},
                {status: 502},
            );
        }
        console.error('[person/pinreg] unexpected error', err);
        return NextResponse.json({error: 'Internal server error', code: 'INTERNAL_ERROR'}, {status: 500});
    }
}
