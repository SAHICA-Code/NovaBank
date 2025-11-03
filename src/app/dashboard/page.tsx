// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import Image from "next/image";
import DeleteAccountButton from "./ui/DeleteAccountButton";
import ChangePasswordModal from "./ui/ChangePasswordModal";
import UserMenu from "./ui/UserMenu";

export const dynamic = "force-dynamic";

function startOfYear(d = new Date()) {
    return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    export default async function Dashboard() {
    noStore();

    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/login");

    let userId: string | null = (session.user as any).id ?? null;
    if (!userId) {
        const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true },
        });
        if (!dbUser) redirect("/auth/login");
        userId = dbUser.id;
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const toNum = (v: unknown) => Number(v ?? 0);

    const [
        clientsCount,
        totalLoans,
        activeLoans,
        loansThisYear,
        pendingPayments,
        paidPayments,
        financeAgg,
    ] = await Promise.all([
        prisma.client.count({ where: { ownerId: userId } }),
        prisma.loan.count({ where: { ownerId: userId } }),
        prisma.loan.count({
        where: { ownerId: userId, payments: { some: { status: "PENDING" } } },
        }),
        prisma.loan.count({
        where: { ownerId: userId, createdAt: { gte: startOfYear() } },
        }),
        prisma.payment.findMany({
        where: { loan: { ownerId: userId }, status: "PENDING" },
        select: { amount: true },
        }),
        prisma.payment.findMany({
        where: { loan: { ownerId: userId }, status: "PAID" },
        select: { amount: true },
        }),
        prisma.loan.aggregate({
        where: { ownerId: userId },
        _sum: { amount: true, totalToRepay: true },
        }),
    ]);

    const invested = toNum(financeAgg._sum.amount);
    const totalToCollect = toNum(financeAgg._sum.totalToRepay);
    const profitProjected = totalToCollect - invested;

    // Tipado explícito en los map para evitar "implicit any"
    const pendingTotal = sum(
        pendingPayments.map((p: { amount: unknown }) => Number(p.amount ?? 0))
    );
    const collectedTotal = sum(
        paidPayments.map((p: { amount: unknown }) => Number(p.amount ?? 0))
    );

    const recoveredCapital = Math.min(collectedTotal, invested);
    const realizedProfit = Math.max(collectedTotal - invested, 0);
    const capitalToRecover = Math.max(invested - recoveredCapital, 0);
    const profitRemaining = Math.max(profitProjected - realizedProfit, 0); // puede que no lo uses en UI ahora
    const breakEven = capitalToRecover === 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        {/* HEADER */}
        <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            {/* Logo + nombre */}
            <div className="flex items-center gap-3 md:gap-4 justify-center md:justify-start">
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14">
                <Image
                    src="/logo.png"
                    alt="Logo Nova Bank"
                    fill
                    className="object-contain rounded-xl"
                    priority
                />
                </div>
                <div className="text-center md:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-700 tracking-tight">
                    Nova Bank
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm -mt-0.5">
                    Resumen de tu actividad
                </p>
                </div>
            </div>

            {/* Usuario */}
            <div className="text-center md:text-right px-1">
                <p className="text-[11px] sm:text-xs text-gray-500">Sesión iniciada como</p>
                <UserMenu email={session.user?.email ?? ""} />
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3">
                <a
                href="/clients"
                className="rounded-xl bg-indigo-500 text-white px-4 py-2 md:py-2.5 font-medium shadow-sm hover:brightness-110 transition text-center w-full"
                >
                Clientes
                </a>

                {/* Cambiar a panel de cliente */}
                <a
                href="/cliente"
                className="rounded-xl border-2 border-sky-300 bg-white/80 px-4 py-2 md:py-2.5 font-medium shadow-sm hover:bg-sky-50 transition text-center w-full"
                >
                Cambiar a panel de cliente
                </a>

                <form action="/api/auth/signout" method="post" className="w-full md:w-auto">
                <button
                    type="submit"
                    className="w-full rounded-xl border border-rose-300 bg-rose-50 text-rose-600 px-4 py-2 md:py-2.5 font-medium shadow-sm hover:bg-rose-100 transition"
                >
                    Cerrar sesión
                </button>
                </form>
            </div>
            </div>

            <ChangePasswordModal />
            <DeleteAccountButton email={session.user?.email ?? ""} />
        </header>

        {/* MAIN */}
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
                title="Clientes"
                value={clientsCount}
                hint="Personas que piden un préstamo"
                emoji="👥"
                accent="from-indigo-200 to-indigo-100"
                href="/clients"
                cta="Ver todos →"
            />
            <StatCard
                title="Préstamos activos"
                value={activeLoans}
                hint="Con cuotas pendientes"
                emoji="🟢"
                accent="from-emerald-200 to-emerald-100"
            />
            <StatCard
                title="Préstamos totales"
                value={totalLoans}
                hint="Histórico"
                emoji="💶"
                accent="from-amber-200 to-amber-100"
            />
            <StatCard
                title="Este año"
                value={loansThisYear}
                hint="Desde 1 de enero"
                emoji="📅"
                accent="from-sky-200 to-sky-100"
            />
            </div>

            {/* ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <a
                href="/loans/new"
                className="rounded-2xl border-2 border-indigo-300 bg-white/80 backdrop-blur p-4 hover:bg-indigo-50 shadow-sm transition"
            >
                <div className="text-base sm:text-lg font-semibold text-indigo-700">
                Nuevo préstamo
                </div>
                <p className="text-sm text-gray-500">
                Crea un préstamo y genera automáticamente todas las cuotas.
                </p>
            </a>
            <a
                href="/payments"
                className="rounded-2xl border-2 border-emerald-300 bg-white/80 backdrop-blur p-4 hover:bg-emerald-50 shadow-sm transition"
            >
                <div className="text-base sm:text-lg font-semibold text-emerald-700">
                Ver cuotas
                </div>
                <p className="text-sm text-gray-500">
                Revisa próximas cuotas y marca como pagadas.
                </p>
            </a>
            </div>

            {/* SECCIÓN FINANZAS */}
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-6">
                <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Resumen financiero
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                    Proyección total y estado actual (lo cobrado hasta hoy)
                </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm sm:text-base">
                <div>
                    <span className="text-gray-600 font-medium">Inversión: </span>
                    <span className="font-semibold">{invested.toFixed(2)} €</span>
                </div>
                <div>
                    <span className="text-emerald-600 font-medium">Beneficio previsto: </span>
                    <span className="font-semibold text-emerald-700">
                    {profitProjected.toFixed(2)} €
                    </span>
                </div>
                <div>
                    <span className="text-gray-800 font-medium">Total final: </span>
                    <span className="font-semibold text-gray-900">
                    {totalToCollect.toFixed(2)} €
                    </span>
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MiniStat title="Cobrado hasta hoy" value={`${collectedTotal.toFixed(2)} €`} />
                <MiniStat title="Capital recuperado" value={`${recoveredCapital.toFixed(2)} €`} />
                <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                <div className="text-xs text-gray-500">Capital por recuperar</div>
                <div className="text-lg font-semibold">{capitalToRecover.toFixed(2)} €</div>
                <div className={`text-xs mt-0.5 ${breakEven ? "text-emerald-600" : "text-amber-600"}`}>
                    {breakEven ? "Ya estás en beneficio" : "Aún recuperando capital"}
                </div>
                </div>
                <MiniStat title="Beneficio cobrado" value={`${realizedProfit.toFixed(2)} €`} highlight />
            </div>

            <div className="border-t border-gray-200 pt-3 mt-2">
                <div className="text-xs sm:text-sm text-gray-500">Total pendiente (todas las cuotas)</div>
                <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-semibold text-indigo-700">
                {pendingTotal.toFixed(2)} €
                </div>
            </div>
            </div>
        </main>
        </div>
    );
    }

    /* ---------- COMPONENTES ---------- */

    function StatCard({
    title,
    value,
    hint,
    emoji,
    accent,
    href,
    cta,
    }: {
    title: string;
    value: number;
    hint: string;
    emoji: string;
    accent: string;
    href?: string;
    cta?: string;
    }) {
    const content = (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur shadow-sm p-4 sm:p-5 hover:bg-white transition">
        <div className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-br ${accent} px-2.5 py-1 text-xs sm:text-sm`}>
            <span className="leading-none">{emoji}</span>
            <span className="font-medium">{title}</span>
        </div>
        <div className="mt-2 sm:mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">{hint}</p>
        {cta ? <div className="text-xs text-indigo-600 mt-2">{cta}</div> : null}
        </div>
    );

    return href ? <a href={href}>{content}</a> : content;
    }

    function MiniStat({
    title,
    value,
    highlight = false,
    }: {
    title: string;
    value: string;
    highlight?: boolean;
    }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
        <div className="text-xs text-gray-500">{title}</div>
        <div className={`text-lg font-semibold ${highlight ? "text-emerald-700" : ""}`}>{value}</div>
        </div>
    );
}
