'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Label,
} from 'recharts';

interface DataPoint {
    month: string;
    employees: number;
}

interface EmployeeTrendChartProps {
    data: DataPoint[];
}

function detectDrops(data: DataPoint[]): string[] {
    const drops: string[] = [];
    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1].employees;
        const curr = data[i].employees;
        if (prev > 0 && curr / prev < 0.5) {
            drops.push(data[i].month);
        }
    }
    return drops;
}

export default function EmployeeTrendChart({ data }: EmployeeTrendChartProps) {
    if (!data || data.length === 0) {
        return <div style={{ padding: '16px', color: '#888' }}>No workforce history available.</div>;
    }

    const drops = detectDrops(data);

    // Show every 6th label to avoid crowding
    const tickFormatter = (month: string, index: number) => {
        if (index % 6 === 0) return month.slice(0, 7);
        return '';
    };

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                    dataKey="month"
                    tickFormatter={tickFormatter}
                    tick={{ fontSize: 11 }}
                    interval={0}
                >
                    <Label value="Month" offset={-10} position="insideBottom" style={{ fontSize: 11 }} />
                </XAxis>
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip
                    formatter={(v: unknown) => [(v as number).toLocaleString(), 'Employees']}
                    labelFormatter={(label: unknown) => String(label).slice(0, 7)}
                />
                <Line
                    type="monotone"
                    dataKey="employees"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
                {drops.map(month => (
                    <ReferenceLine
                        key={month}
                        x={month}
                        stroke="#f44336"
                        strokeDasharray="4 2"
                        label={{ value: '⚠', position: 'top', fontSize: 12, fill: '#f44336' }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
