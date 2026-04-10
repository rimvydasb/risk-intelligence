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
        const [companies, persons] = await Promise.all([
            prisma.company.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { jarKodas: { contains: query } },
                    ],
                },
                take: 10,
            }),
            prisma.person.findMany({
                where: {
                    fullName: { contains: query, mode: 'insensitive' },
                },
                take: 10,
            }),
        ]);

        return NextResponse.json([...companies, ...persons]);
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
