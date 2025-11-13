// src/app/loans/new/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewLoanForm from "./ui/NewLoanForm";

export const dynamic = "force-dynamic";

// Next 15: searchParams es una Promise
type SearchParamsPromise = Promise<{ loanId?: string }>;

export default async function NewLoanPage({
    searchParams,
    }: {
    searchParams: SearchParamsPromise;
    }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true },
    });
    if (!user) redirect("/auth/login");

    const { loanId } = await searchParams;

    const [clients, loan] = await Promise.all([
        prisma.client.findMany({
        where: { ownerId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        }),
        loanId
        ? prisma.loan.findFirst({
            where: { id: loanId, ownerId: user.id },
            })
        : Promise.resolve(null),
    ]);

    const initialLoan = loan
        ? {
            id: loan.id,
            clientId: loan.clientId,
            amount: Number(loan.amount),
            months: Number(loan.months ?? 0),
            startDate: loan.startDate.toISOString().slice(0, 10),
        }
        : undefined;

    const isEdit = !!initialLoan;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        <header className="mx-auto max-w-6xl px-6 pt-8">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold">
                {isEdit ? "Editar préstamo" : "Nuevo préstamo"}
                </h1>
                <p className="text-gray-500 mt-1">
                Define el importe, la <b>fecha de inicio y la fecha final</b> o, si
                prefieres, <b>indica directamente los meses</b>. El sistema
                calculará automáticamente los <b>días totales</b> entre ambas
                fechas y sugerirá un <b>% de recargo simple</b> basado en esos
                días (por ejemplo, <code>días × 1,5</code>, configurable según la
                persona o la urgencia). El total a devolver será{" "}
                <code>importe × (1 + %/100)</code>.
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

        <main className="mx-auto max-w-6xl px-6 py-8">
            <NewLoanForm
            clients={clients}
            mode={isEdit ? "edit" : "create"}
            initialLoan={initialLoan}
            />
        </main>
        </div>
    );
}
