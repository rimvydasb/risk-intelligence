import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    try {
        const results = await prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { jarKodas: { contains: query } },
                ],
            },
            take: 20,
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
