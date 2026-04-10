'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface ProcurementYearRow {
    year: number;
    asBuyerEur: number;
    asSupplierEur: number;
}

interface ProcurementBarChartProps {
    data: ProcurementYearRow[];
}

function formatMillions(value: number) {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}k`;
    return `€${value}`;
}

export default function ProcurementBarChart({ data }: ProcurementBarChartProps) {
    if (!data || data.length === 0) {
        return <div style={{ padding: '16px', color: '#888' }}>No procurement history available.</div>;
    }

    const sorted = [...data].sort((a, b) => a.year - b.year);

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sorted} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatMillions} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: unknown) => [formatMillions(v as number), '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="asBuyerEur" name="As Buyer" fill="#1976d2" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="asSupplierEur" name="As Supplier" fill="#f57c00" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    );
}
