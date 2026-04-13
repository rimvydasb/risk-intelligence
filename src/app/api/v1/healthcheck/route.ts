import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface HealthcheckResult {
  status: 'ok' | 'error';
  database: boolean;
  stagingCounts: {
    asmuo: number;
    sutartis: number;
    pirkimas: number;
  };
  error?: string;
}

export async function GET() {
  try {
    const [asmuoCount, sutartisCount, pirkimasCount] = await Promise.all([
      db.stagingAsmuo.count(),
      db.stagingSutartis.count(),
      db.stagingPirkimas.count(),
    ]);

    const result: HealthcheckResult = {
      status: 'ok',
      database: true,
      stagingCounts: {
        asmuo: asmuoCount,
        sutartis: sutartisCount,
        pirkimas: pirkimasCount,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    const result: HealthcheckResult = {
      status: 'error',
      database: false,
      stagingCounts: { asmuo: 0, sutartis: 0, pirkimas: 0 },
      error: err instanceof Error ? err.message : 'Database connection failed',
    };

    return NextResponse.json(result, { status: 503 });
  }
}
