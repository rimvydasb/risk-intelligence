'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SparkLineProps {
    data: { month: string; value: number }[];
    color?: string;
}

export default function SparkLine({ data, color = '#1976d2' }: SparkLineProps) {
    if (!data || data.length === 0) return null;

    return (
        <ResponsiveContainer width="100%" height={40}>
            <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
                <Tooltip
                    formatter={(v: unknown) => [(v as number).toLocaleString(), '']}
                    labelFormatter={(label: unknown) => String(label)}
                    contentStyle={{ fontSize: 11 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
