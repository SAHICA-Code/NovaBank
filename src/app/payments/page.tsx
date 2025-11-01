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

    // Clientes para el filtro
    const clients = await prisma.client.findMany({
        where: { ownerId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    // Filtro por cliente si viene en query
    const where = {
        loan: {
        ownerId: user.id,
        ...(clientId ? { clientId } : {}),
        },
    } as const;

    const raw = await prisma.payment.findMany({
        where,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: {
        loan: {
            select: {
            amount: true,          // importe prestado (inversión)
            markupPercent: true,   // % recargo simple
            client: { select: { name: true } },
            },
        },
        },
    });

    // Serializar para el Client Component
    const payments = raw.map((p) => ({
        id: p.id,
        dueDate: p.dueDate.toISOString(),
        amount: Number(p.amount),
        interest: 0, // sin desglose en BD
        principal: Number(p.amount),
        status: p.status as "PENDING" | "PAID" | "LATE",
        loan: {
        client: { name: p.loan.client.name },
        amount: Number(p.loan.amount),                 // inversión del préstamo
        markupPercent: Number(p.loan.markupPercent),   // % recargo
        },
    }));

    const pendingTotal = payments
        .filter((p) => p.status === "PENDING")
        .reduce((acc, p) => acc + p.amount, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-indigo-50 to-emerald-50">
        <header className="mx-auto max-w-6xl px-6 pt-8">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Cuotas</h1>
                <p className="text-gray-500 mt-1">
                Revisa tus cuotas, filtra por cliente y marca las pagadas.
                </p>
            </div>
            <a
                href="/dashboard"
                className="rounded-xl border border-indigo-200 bg-white/70 px-4 py-2 font-medium shadow-sm hover:bg-indigo-50 transition"
            >
                ← Volver al Dashboard
            </a>
            </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
            {/* Barra superior: Filtro + Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filtro por cliente (Server Component compatible) */}
            <form method="get" action="/payments" className="flex items-center gap-2">
                <select
                name="clientId"
                defaultValue={clientId}
                className="rounded-xl border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-300 px-3 py-2 bg-white/70"
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
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white/70 hover:bg-white"
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

            {/* Total pendiente (global o del cliente seleccionado) */}
            <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4 shadow-sm">
            <p className="text-sm">
                Total pendiente {clientId ? "del cliente" : "global"}:{" "}
                <b>{pendingTotal.toFixed(2)} €</b>
            </p>
            </div>

            {/* Listado de cuotas */}
            <PaymentsList initial={payments} />
        </main>
        </div>
    );
}
