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

type ClientOption = {
    id: string;
    name: string;
};

type ClientSummaryRow = {
    clientId: string;
    name: string;
    invested: number;
    toCollect: number;
    paid: number;
    pending: number;
};

type LoanCard = {
    id: string;
    clientName: string;
    invested: number;
    totalToRepay: number;
    paid: number;
    pending: number;
    firstDueDate: Date | null;
    lastDueDate: Date | null;
};

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
    const clients: ClientOption[] = await prisma.client.findMany({
        where: { ownerId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const currentClient = clientId
        ? clients.find((c) => c.id === clientId)
        : undefined;
    const currentClientName = currentClient?.name ?? "este cliente";

    // --------- Pagos (para la tabla de cuotas y para agrupar por préstamo) ---------
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
                    id: true,
                    amount: true, // importe prestado (inversión)
                    totalToRepay: true, // total contratado a devolver
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

    // --------- AGRUPACIÓN VISUAL POR PRÉSTAMO (para el cliente filtrado) ---------
    const loansMap = new Map<string, LoanCard>();

    for (const p of raw) {
        const loanId = p.loan.id;
        const existing = loansMap.get(loanId);

        if (!existing) {
            loansMap.set(loanId, {
                id: loanId,
                clientName: p.loan.client.name,
                invested: Number(p.loan.amount),
                totalToRepay: Number(p.loan.totalToRepay ?? p.loan.amount),
                paid: p.status === "PAID" ? Number(p.amount) : 0,
                pending: 0, // lo calculamos luego
                firstDueDate: p.dueDate,
                lastDueDate: p.dueDate,
            });
        } else {
            // sumamos lo cobrado
            if (p.status === "PAID") {
                existing.paid += Number(p.amount);
            }
            // primera y última fecha de cuota
            if (!existing.firstDueDate || p.dueDate < existing.firstDueDate) {
                existing.firstDueDate = p.dueDate;
            }
            if (!existing.lastDueDate || p.dueDate > existing.lastDueDate) {
                existing.lastDueDate = p.dueDate;
            }
        }
    }

    const loanCards: LoanCard[] = Array.from(loansMap.values()).map((card) => {
        const pending = Math.max(card.totalToRepay - card.paid, 0);
        return { ...card, pending };
    });

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
    const byClient = new Map<string, ClientSummaryRow>();

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
                                totals.paid < totals.invested
                                    ? "text-red-600"
                                    : "text-emerald-700"
                            }`}
                        >
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

                {/* PRÉSTAMOS INDIVIDUALES (VISTA VISUAL) */}
                {clientId && (
                    <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h3 className="text-lg font-semibold">
                                Préstamos de {currentClientName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Aquí ves cada préstamo separado, con su importe, cobros, pendiente y
                                fecha final (última cuota).
                            </p>
                        </div>

                        {loanCards.length === 0 && (
                            <p className="text-sm text-gray-500">
                                Este cliente no tiene préstamos con cuotas registradas.
                            </p>
                        )}

                        {loanCards.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loanCards.map((loan, index) => (
                                    <div
                                        key={loan.id}
                                        className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm flex flex-col gap-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-gray-400">
                                                    Préstamo #{index + 1}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Cliente:{" "}
                                                    <span className="font-medium">
                                                        {loan.clientName}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">
                                                    Fecha final
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {loan.lastDueDate
                                                        ? new Intl.DateTimeFormat("es-ES").format(
                                                              loan.lastDueDate
                                                          )
                                                        : "-"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                            <div className="space-y-1">
                                                <div className="text-gray-500">Invertido</div>
                                                <div className="font-semibold text-gray-900">
                                                    {loan.invested.toFixed(2)} €
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-gray-500">Total a cobrar</div>
                                                <div className="font-semibold text-gray-900">
                                                    {loan.totalToRepay.toFixed(2)} €
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-gray-500">Cobrado</div>
                                                <div className="font-semibold text-emerald-700">
                                                    {loan.paid.toFixed(2)} €
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-gray-500">Pendiente</div>
                                                <div
                                                    className={
                                                        loan.pending > 0
                                                            ? "font-semibold text-red-600"
                                                            : "font-semibold text-emerald-700"
                                                    }
                                                >
                                                    {loan.pending.toFixed(2)} €
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                            <div className="text-[11px] text-gray-500">
                                                Primera cuota:{" "}
                                                {loan.firstDueDate
                                                    ? new Intl.DateTimeFormat("es-ES").format(
                                                            loan.firstDueDate
                                                        )
                                                    : "-"}
                                            </div>
                                            <div className="flex gap-2">
                                                <a
                                                    href={`/loans/new?loanId=${loan.id}`}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                                                    >
                                                    Editar préstamo
                                                </a>

                                                <form
                                                    action={`/loans/${loan.id}/delete`}
                                                    method="post"
                                                >
                                                    <button
                                                        type="submit"
                                                        className="px-3 py-1.5 rounded-xl text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition"
                                                    >
                                                        Borrar
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

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
                                        <td className="py-2 px-3 text-right">
                                            {r.invested.toFixed(2)} €
                                        </td>
                                        <td className="py-2 px-3 text-right text-emerald-700">
                                            {r.paid.toFixed(2)} €
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            {r.toCollect.toFixed(2)} €
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium">
                                            {r.pending.toFixed(2)} €
                                        </td>
                                    </tr>
                                ))}
                                {clientSummary.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-6 text-gray-500 text-center"
                                        >
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
