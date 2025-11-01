// src/components/client/DashboardCards.tsx
"use client";

type Props = {
    totalMes: number;
    prestamosActivos: number;
    cuotasPendientes: number;
    };

    export default function DashboardCards({
    totalMes,
    prestamosActivos,
    cuotasPendientes,
    }: Props) {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pagos de este mes</p>
            <p className="mt-1 text-2xl font-semibold">
            {totalMes.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            </p>
        </div>

        <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Préstamos activos</p>
            <p className="mt-1 text-2xl font-semibold">{prestamosActivos}</p>
        </div>

        <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Cuotas pendientes este mes</p>
            <p className="mt-1 text-2xl font-semibold">{cuotasPendientes}</p>
        </div>
        </section>
    );
}
