// src/app/cliente/prestamos/[loanId]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ClientInstallmentStatus } from "@prisma/client";

/** Server Action: marcar cuota como pagada */
async function markPaid(installmentId: string, loanId: string) {
    "use server";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    // Validación: la cuota debe pertenecer al usuario autenticado
    const inst = await prisma.clientInstallment.findUnique({
        where: { id: installmentId },
        select: {
        id: true,
        userId: true,
        status: true,
        },
    });

    if (!inst || inst.userId !== session.user.id) {
        throw new Error("No autorizado.");
    }
    if (inst.status === ClientInstallmentStatus.PAID) {
        return; // nada que hacer
    }

    await prisma.clientInstallment.update({
        where: { id: installmentId },
        data: {
        status: ClientInstallmentStatus.PAID,
        paidAt: new Date(),
        },
    });

    revalidatePath(`/cliente/prestamos/${loanId}`);
    }

    export default async function LoanDetailPage({
    params,
    }: {
    params: { loanId: string };
    }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    // Traer el préstamo del usuario + sus cuotas
    const loan = await prisma.clientLoan.findFirst({
        where: {
        id: params.loanId,
        userId: session.user.id,
        },
        include: {
        installments: {
            orderBy: { dueDate: "asc" },
        },
        },
    });

    if (!loan) return notFound();

    const totalPendiente = loan.installments
        .filter((i) => i.status !== ClientInstallmentStatus.PAID)
        .reduce((acc: number, i) => acc + Number(i.amount ?? 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        {/* HEADER / breadcrumb simple */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/cliente" className="hover:underline">
                    Panel de cliente
                </Link>
                <span>›</span>
                <span className="text-gray-700">Préstamo</span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-indigo-700">
                {loan.title}
                </h1>
                <p className="text-sm text-gray-500">
                Inicio: {new Date(loan.startDate).toLocaleDateString("es-ES")} · Meses: {loan.months}
                </p>
            </div>

            <Link
                href="/cliente"
                className="rounded-xl border border-gray-300 bg-white/80 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
            >
                Volver al panel
            </Link>
            </div>
        </div>

        {/* MÉTRICAS */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <p className="text-sm text-gray-500">Cuota mensual</p>
                <p className="mt-1 text-2xl font-semibold">
                {loan.monthlyPayment != null
                    ? Number(loan.monthlyPayment).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                    })
                    : "—"}
                </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <p className="text-sm text-gray-500">Extras mensuales</p>
                <p className="mt-1 text-2xl font-semibold">
                {loan.monthlyExtras != null
                    ? Number(loan.monthlyExtras).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                    })
                    : "—"}
                </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-4 shadow-sm">
                <p className="text-sm text-gray-500">Pendiente total</p>
                <p className="mt-1 text-2xl font-semibold">
                {totalPendiente.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
            </div>
            </div>
        </div>

        {/* TABLA estilo “empresa/payments” */}
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Calendario de cuotas
                </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                    <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                    <th>Fecha</th>
                    <th className="text-right">Importe</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loan.installments.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Este préstamo aún no tiene cuotas generadas.
                        </td>
                    </tr>
                    )}

                    {loan.installments.map((inst) => {
                    const isPaid = inst.status === ClientInstallmentStatus.PAID;
                    return (
                        <tr key={inst.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-4 py-2">
                            {new Date(inst.dueDate).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-4 py-2 text-right">
                            {Number(inst.amount).toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            })}
                        </td>
                        <td className="px-4 py-2">
                            {isPaid ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                Pagada
                            </span>
                            ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Pendiente
                            </span>
                            )}
                        </td>
                        <td className="px-4 py-2 text-right">
                            {isPaid ? (
                            <span className="text-xs text-gray-400">—</span>
                            ) : (
                            <form
                                action={async () => {
                                "use server";
                                await markPaid(inst.id, loan.id);
                                }}
                            >
                                <button
                                type="submit"
                                className="inline-flex items-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 shadow-sm transition"
                                >
                                Marcar pagada
                                </button>
                            </form>
                            )}
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            </section>
        </main>
        </div>
    );
}
