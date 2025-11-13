// src/app/payments/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaymentsList from "./ui/PaymentsList";
import ImportXlsx from "./ui/ImportXlsx";
import ExportXlsxButton from "./ui/ExportXlsxButton";

export const dynamic = "force-dynamic";

// Next.js 15: searchParams es asíncrono en Server Components
type SearchParamsPromise = Promise<{ clientId?: string }>;

export default async function PaymentsPage({
    searchParams,
    }: {
    searchParams: SearchParamsPromise;
    }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) redirect("/auth/login");

    const { clientId = "" } = await searchParams; // <- await obligatorio

    // --------- Datos base para filtros ---------
    const clients = await prisma.client.findMany({
        where: { ownerId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    // --------- Pagos (para la tabla de cuotas) ---------
    const raw = await prisma.payment.findMany({
        where: {
        loan: {
            ownerId: user.id,
            ...(clientId ? { clientId } : {}),
        },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: {
        loan: {
            select: {
            amount: true, // importe prestado (inversión)
            markupPercent: true, // % recargo simple
            client: { select: { name: true, id: true } },
            },
        },
        },
    });

    // Serializar para el Client Component (tabla de cuotas)
    const payments = raw.map((p) => ({
        id: p.id,
        dueDate: p.dueDate.toISOString(),
        amount: Number(p.amount),
        interest: 0, // sin desglose en BD
        principal: Number(p.amount),
        status: p.status as "PENDING" | "PAID" | "LATE",
        loan: {
        client: { name: p.loan.client.name },
        amount: Number(p.loan.amount), // inversión del préstamo
        markupPercent: Number(p.loan.markupPercent), // % recargo
        },
    }));

    const pendingTotal = payments
        .filter((p) => p.status === "PENDING")
        .reduce((acc, p) => acc + p.amount, 0);

    // --------- Resumen por cliente (invertido, cobrado, total a pagar) ---------
    // 1) Préstamos del usuario (para invertido y total a pagar)
    const loans = await prisma.loan.findMany({
        where: {
        ownerId: user.id,
        ...(clientId ? { clientId } : {}),
        },
        select: {
        amount: true,
        totalToRepay: true,
        clientId: true,
        client: { select: { name: true } },
        },
    });

    // 2) Pagos cobrados (para "cobrado")
    const paidPayments = await prisma.payment.findMany({
        where: {
        status: "PAID",
        loan: { ownerId: user.id, ...(clientId ? { clientId } : {}) },
        },
        select: {
        amount: true,
        loan: { select: { clientId: true, client: { select: { name: true } } } },
        },
    });

    // 3) Agregados por cliente
    type Row = {
        clientId: string;
        name: string;
        invested: number;
        toCollect: number;
        paid: number;
        pending: number;
    };

    const byClient = new Map<string, Row>();

    // Inicializa con préstamos (invertido y total a pagar)
    for (const l of loans) {
        const key = l.clientId;
        if (!byClient.has(key)) {
        byClient.set(key, {
            clientId: key,
            name: l.client.name,
            invested: 0,
            toCollect: 0,
            paid: 0,
            pending: 0,
        });
        }
        const row = byClient.get(key)!;
        row.invested += Number(l.amount);
        row.toCollect += Number(l.totalToRepay);
    }

    // Suma cobrado
    for (const p of paidPayments) {
        const key = p.loan.clientId;
        if (!byClient.has(key)) {
        // por si hay pagos cobrados pero no cargamos préstamos por algún filtro
        byClient.set(key, {
            clientId: key,
            name: p.loan.client.name,
            invested: 0,
            toCollect: 0,
            paid: 0,
            pending: 0,
        });
        }
        const row = byClient.get(key)!;
        row.paid += Number(p.amount);
    }

    // Calcula pendiente por cliente
    for (const row of byClient.values()) {
        row.pending = Math.max(row.toCollect - row.paid, 0);
    }

    const clientSummary = Array.from(byClient.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "es")
    );

    // Totales globales
    const totals = clientSummary.reduce(
        (acc, r) => {
        acc.invested += r.invested;
        acc.paid += r.paid;
        acc.toCollect += r.toCollect;
        return acc;
        },
        { invested: 0, paid: 0, toCollect: 0 }
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        {/* HEADER */}
        <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5 sm:pt-7">
            <div className="flex items-start justify-between gap-3">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Cuotas
                </h1>
                <p className="text-gray-500 mt-1">
                Revisa tus cuotas, filtra por cliente y marca las pagadas.
                </p>
            </div>

            <a
                href="/dashboard"
                className="rounded-xl border border-indigo-200 bg-white/80 px-4 py-2 font-medium shadow-sm hover:bg-white transition"
            >
                ← Volver al Dashboard
            </a>
            </div>
        </header>

        {/* MAIN */}
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            {/* Barra superior: Filtro + Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filtro por cliente */}
            <form method="get" action="/payments" className="flex items-center gap-2">
                <select
                name="clientId"
                defaultValue={clientId}
                className="rounded-xl border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-300 px-3 py-2 bg-white/80"
                >
                <option value="">Todos los clientes</option>
                {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                    {c.name}
                    </option>
                ))}
                </select>

                <button
                type="submit"
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 hover:bg-white"
                >
                Filtrar
                </button>
            </form>

            {/* Acciones: Exportar / Importar */}
            <div className="flex items-center gap-2">
                <ExportXlsxButton />
                <ImportXlsx />
            </div>
            </div>

            {/* Totales globales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs text-gray-500">Invertido total</div>
                <div className="text-xl font-semibold text-gray-900">
                {totals.invested.toFixed(2)} €
                </div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
            <div className="text-xs text-gray-500">Cobrado (todos los clientes)</div>
            <div
                className={`text-xl font-semibold ${
                totals.paid < totals.invested ? "text-red-600" : "text-emerald-700"
                }`}>
                {totals.paid.toFixed(2)} €
            </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs text-gray-500">Total a pagar (contratado)</div>
                <div className="text-xl font-semibold text-gray-900">
                {totals.toCollect.toFixed(2)} €
                </div>
            </div>
            </div>

            {/* Total pendiente (global o del cliente seleccionado) */}
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <p className="text-sm">
                    Total pendiente {clientId ? "del cliente" : "global"}:{" "}
                    <b className={pendingTotal > 0 ? "text-red-600" : "text-emerald-700"}>
                    {pendingTotal.toFixed(2)} €
                    </b>
                </p>
            </div>
            
            {/* Resumen por cliente */}
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6">
            <h3 className="text-lg font-semibold mb-3">Resumen por cliente</h3>
            <div
                className="rounded-xl border border-gray-200 bg-white/70 overflow-x-auto"
                style={{ WebkitOverflowScrolling: "touch" as any }}
            >
                <table className="w-full text-sm">
                <thead>
                    <tr className="text-gray-600 border-b bg-gray-50/70">
                    <th className="text-left py-2 px-3">Cliente</th>
                    <th className="text-right py-2 px-3">Invertido total</th>
                    <th className="text-right py-2 px-3">Cobrado</th>
                    <th className="text-right py-2 px-3">Total a pagar</th>
                    <th className="text-right py-2 px-3">Pendiente</th>
                    </tr>
                </thead>
                <tbody>
                    {clientSummary.map((r) => (
                    <tr key={r.clientId} className="border-b last:border-0">
                        <td className="py-2 px-3">{r.name}</td>
                        <td className="py-2 px-3 text-right">{r.invested.toFixed(2)} €</td>
                        <td className="py-2 px-3 text-right text-emerald-700">
                        {r.paid.toFixed(2)} €
                        </td>
                        <td className="py-2 px-3 text-right">{r.toCollect.toFixed(2)} €</td>
                        <td className="py-2 px-3 text-right font-medium">
                        {r.pending.toFixed(2)} €
                        </td>
                    </tr>
                    ))}
                    {clientSummary.length === 0 && (
                    <tr>
                        <td colSpan={5} className="py-6 text-gray-500 text-center">
                        No hay datos para el filtro seleccionado.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
            </section>

            {/* Listado de cuotas */}
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6">
            <h3 className="text-lg font-semibold mb-3">Listado de cuotas</h3>
            <div
                className="rounded-xl border border-gray-200 bg-white/70 overflow-x-auto"
                style={{ WebkitOverflowScrolling: "touch" as any }}
            >
                <PaymentsList initial={payments} />
            </div>
            </section>
        </main>
        </div>
    );
}
