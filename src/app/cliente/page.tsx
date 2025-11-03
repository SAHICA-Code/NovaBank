// src/app/cliente/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import ChangePasswordModal from "@/app/dashboard/ui/ChangePasswordModal";
import DeleteAccountButton from "@/app/dashboard/ui/DeleteAccountButton";
import UserMenu from "@/app/dashboard/ui/UserMenu";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    }
    function endOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    function formatMoney(n: number) {
    return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
    }

    export default async function ClienteDashboardPage() {
    noStore();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });
    if (!profile) redirect("/cliente/onboarding");

    const now = new Date();
    const from = startOfMonth(now);
    const to = endOfMonth(now);

    const [loans, installmentsThisMonth, pendingAll] = await Promise.all([
        prisma.clientLoan.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        }),
        prisma.clientInstallment.findMany({
        where: { userId: session.user.id, dueDate: { gte: from, lte: to } },
        orderBy: { dueDate: "asc" },
        }),
        prisma.clientInstallment.findMany({
        where: { userId: session.user.id, status: { not: "PAID" } },
        select: { amount: true },
        }),
    ]);

    // Totales del mes
    const totalMes: number = installmentsThisMonth.reduce(
        (acc: number, i: { amount: any }) => acc + Number(i.amount ?? 0),
        0
    );

    const totalPagadoMes: number = installmentsThisMonth
        .filter((i: any) => i.status === "PAID")
        .reduce((acc: number, i: any) => acc + Number(i.amount ?? 0), 0);

    const cuotasPendientesMes: number = installmentsThisMonth.filter(
        (i: { status: string }) => i.status !== "PAID"
    ).length;

    const totalPendienteGlobal: number = pendingAll.reduce(
        (acc: number, it: { amount: any }) => acc + Number(it.amount ?? 0),
        0
    );

    const progresoMes = totalMes > 0 ? (totalPagadoMes / totalMes) * 100 : 0;

    // Estilos de tabla (look limpio + scroll horizontal)
    const tableWrap =
        "rounded-2xl border border-black/5 bg-white/80 backdrop-blur overflow-x-auto";
    const tableBase = "w-full min-w-[720px] text-sm text-gray-800";
    const thead =
        "bg-gray-50/80 text-gray-600 sticky top-0 z-0 border-b border-gray-200";
    const th = "px-4 py-3 text-left font-medium whitespace-nowrap";
    const tr = "border-b border-gray-200 last:border-0 hover:bg-gray-50/60";
    const td = "px-4 py-3 align-middle whitespace-nowrap";

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        {/* HEADER */}
        <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            {/* Logo + título */}
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
                <p className="text-[11px] sm:text-xs text-gray-500">
                Sesión iniciada como
                </p>
                <UserMenu email={session.user?.email ?? ""} />
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3">
                <Link
                href="/cliente/prestamos/new"
                className="rounded-xl bg-indigo-500 text-white px-4 py-2 md:py-2.5 font-medium shadow-sm hover:brightness-110 transition text-center"
                >
                Añadir préstamo
                </Link>

                <Link
                href="/dashboard"
                className="rounded-xl border-2 border-sky-300 bg-white text-sky-700 px-4 py-2 md:py-2.5 font-medium shadow-sm hover:bg-sky-50 transition text-center"
                >
                Cambiar a panel de empresa
                </Link>

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

            {/* Modales (desktop) */}
            <div className="hidden md:block">
            <ChangePasswordModal />
            <DeleteAccountButton email={session.user?.email ?? ""} />
            </div>
        </header>

        {/* MAIN */}
        <main className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
            {/* MÉTRICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Gasto total del mes" value={totalMes} money />
            <MetricCard
                title="Pagado este mes"
                value={totalPagadoMes}
                money
                subtitle={`${formatMoney(totalPagadoMes)} de ${formatMoney(totalMes)} pagado`}
                progress={progresoMes}
            />
            <MetricCard title="Cuotas pendientes este mes" value={cuotasPendientesMes} />
            <MetricCard title="Pendiente total" value={totalPendienteGlobal} money accent />
            </div>

            {/* CUOTAS DEL MES (orden nuevo: Préstamo → Importe → Fecha → Estado) */}
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6">
            <h3 className="text-lg font-semibold mb-3">Cuotas de este mes</h3>

            <div
                className={tableWrap}
                style={{ WebkitOverflowScrolling: "touch" as any }}
            >
                <table className={tableBase}>
                <thead className={thead}>
                    <tr>
                    <th className="px-2.5 py-3 text-left font-medium whitespace-nowrap">Préstamo</th>
                    <th className="px-2.5 py-3 text-right font-medium whitespace-nowrap">Importe</th>
                    <th className={th}>Fecha</th>
                    <th className={th}>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {installmentsThisMonth.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        No hay cuotas este mes.
                        </td>
                    </tr>
                    ) : (
                    installmentsThisMonth.map((i: any) => (
                        <tr key={i.id} className={tr}>
                        <td className="px-2.5 py-3 align-middle whitespace-nowrap">{i.title ?? "—"}</td>
                        <td className="px-2.5 py-3 align-middle whitespace-nowrap text-right">
                            {Number(i.amount ?? 0).toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            })}
                        </td>
                        <td className={td}>
                            {new Date(i.dueDate).toLocaleDateString("es-ES")}
                        </td>
                        <td className={td}>
                            {i.status === "PAID" ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                                Pagada
                            </span>
                            ) : (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-200">
                                Pendiente
                            </span>
                            )}
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
            </section>

            {/* TUS PRÉSTAMOS (orden nuevo: Título → Cuota → Inicio → Extras → Acciones) */}
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Tus préstamos</h3>
                <Link
                href="/cliente/prestamos/new"
                className="rounded-xl border-2 border-indigo-300 bg-white text-indigo-700 px-3 py-2 text-sm font-medium shadow-sm hover:bg-indigo-50 transition"
                >
                Añadir préstamo
                </Link>
            </div>

            <div
                className={tableWrap}
                style={{ WebkitOverflowScrolling: "touch" as any }}
            >
                <table className={tableBase}>
                <thead className={thead}>
                    <tr>
                    <th className={th}>Título</th>
                    <th className={`${th} text-right`}>Cuota</th>
                    <th className={th}>Inicio</th>
                    <th className={`${th} text-right`}>Extras</th>
                    <th className={`${th} text-right`}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {loans.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        Aún no has añadido préstamos.
                        </td>
                    </tr>
                    ) : (
                    loans.map((l: any) => (
                        <tr key={l.id} className={tr}>
                        <td className={td}>{l.title}</td>
                        <td className={`${td} text-right`}>
                            {Number(l.monthlyPayment).toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            })}
                        </td>
                        <td className={td}>
                            {new Date(l.startDate).toLocaleDateString("es-ES")}
                        </td>
                        <td className={`${td} text-right`}>
                            {Number(l.monthlyExtras ?? 0).toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            })}
                        </td>
                        <td className={`${td} text-right`}>
                            <Link
                            href={`/cliente/prestamos/${l.id}`}
                            className="inline-flex items-center rounded-xl bg-gray-800/90 text-white px-3 py-1.5 text-xs font-medium shadow-sm hover:brightness-110"
                            >
                            Ver detalle
                            </Link>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
            </section>

            {/* Acciones móviles */}
            <div className="md:hidden flex gap-2">
            <ChangePasswordModal />
            <DeleteAccountButton email={session.user?.email ?? ""} />
            </div>
        </main>
        </div>
    );
    }

    /* ---------- Componentes auxiliares ---------- */

    function MetricCard({
    title,
    value,
    money = false,
    accent = false,
    subtitle,
    progress,
    }: {
    title: string;
    value: number;
    money?: boolean;
    accent?: boolean;
    subtitle?: string;
    progress?: number;
    }) {
    const pct = Math.max(0, Math.min(100, progress ?? 0));

    return (
        <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
        <p className="text-sm text-gray-500">{title}</p>
        <p
            className={`mt-1 text-2xl font-semibold ${
            accent ? "text-indigo-700" : "text-gray-900"
            }`}
        >
            {money ? formatMoney(value) : value}
        </p>

        {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}

        {progress !== undefined ? (
            <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                className="h-2 bg-indigo-600"
                style={{ width: `${pct}%` }}
                aria-label={`Progreso ${pct.toFixed(0)}%`}
                />
            </div>
            <div className="mt-1 text-[11px] text-gray-500">{pct.toFixed(0)}%</div>
            </div>
        ) : null}
        </div>
    );
}
