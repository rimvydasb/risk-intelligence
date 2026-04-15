import {NextRequest, NextResponse} from 'next/server';
import {expandOrg} from '@/lib/graph/expand';
import {ViespirkiaiError} from '@/lib/viespirkiai/types';
import type {GraphFilters} from '@/lib/graph/types';

export async function GET(request: NextRequest, {params}: {params: Promise<{jarKodas: string}>}) {
    const {jarKodas} = await params;

    if (!/^\d{5,10}$/.test(jarKodas)) {
        return NextResponse.json(
            {error: 'Invalid jarKodas — must be 5–10 digits', code: 'INVALID_JAR_KODAS'},
            {status: 400},
        );
    }

    const {searchParams} = request.nextUrl;
    const filters: GraphFilters = {};

    const yearFrom = searchParams.get('yearFrom');
    if (yearFrom !== null) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(yearFrom)) {
            return NextResponse.json({error: 'Invalid yearFrom parameter — expected YYYY-MM-DD', code: 'INVALID_YEAR_FROM'}, {status: 400});
        }
        filters.yearFrom = yearFrom;
    }

    const yearTo = searchParams.get('yearTo');
    if (yearTo !== null) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(yearTo)) {
            return NextResponse.json({error: 'Invalid yearTo parameter — expected YYYY-MM-DD', code: 'INVALID_YEAR_TO'}, {status: 400});
        }
        filters.yearTo = yearTo;
    }

    const minValue = searchParams.get('minContractValue');
    if (minValue !== null) {
        const v = Number(minValue);
        if (!Number.isFinite(v) || v < 0) {
            return NextResponse.json(
                {error: 'Invalid minContractValue parameter', code: 'INVALID_MIN_VALUE'},
                {status: 400},
            );
        }
        filters.minContractValue = v;
    }

    try {
        const result = await expandOrg(jarKodas, filters);
        return NextResponse.json(result);
    } catch (err) {
        if (err instanceof ViespirkiaiError) {
            console.error(
                `[expand] upstream error for jarKodas=${jarKodas}:`,
                err.message,
                'httpStatus:',
                err.statusCode,
            );
            return NextResponse.json(
                {error: 'Upstream data source error', detail: err.message, code: 'UPSTREAM_ERROR'},
                {status: 502},
            );
        }
        console.error('[expand] unexpected error', err);
        return NextResponse.json({error: 'Internal server error', code: 'INTERNAL_ERROR'}, {status: 500});
    }
}
