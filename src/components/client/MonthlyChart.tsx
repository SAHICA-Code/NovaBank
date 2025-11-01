// src/components/client/MonthlyChart.tsx
"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    } from "recharts";

    type Props = {
    data: { month: string; total: number }[];
    };

    export default function MonthlyChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
        <div className="rounded-lg border p-6 text-center text-sm text-gray-500">
            No hay datos suficientes para mostrar el gráfico.
        </div>
        );
    }

    return (
        <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium mb-3">Pagos próximos por mes</h2>
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
                formatter={(value: number) =>
                value.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
                }
            />
            <Bar dataKey="total" fill="#6366f1" />
            </BarChart>
        </ResponsiveContainer>
        </div>
    );
}
