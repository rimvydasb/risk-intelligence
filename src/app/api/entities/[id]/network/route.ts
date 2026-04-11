import { NextResponse } from 'next/server';
import { RiskEngine } from '@/lib/risk-engine';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    try {
        const connections = await RiskEngine.findNetworkConnections(id, 2) as any[];
        return NextResponse.json(connections);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
