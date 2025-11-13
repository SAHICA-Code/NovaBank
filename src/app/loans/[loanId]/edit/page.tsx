// src/app/loans/[loanId]/edit/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewLoanForm from "../../new/ui/NewLoanForm";

export const dynamic = "force-dynamic";

export default async function EditLoanPage({
    params,
}: {
    params: { loanId: string };
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true },
    });
    if (!user) redirect("/auth/login");

    const [loan, clients] = await Promise.all([
        prisma.loan.findFirst({
            where: {
                id: params.loanId,
                ownerId: user.id,
            },
        }),
        prisma.client.findMany({
            where: { ownerId: user.id },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        }),
    ]);

    if (!loan) {
        notFound();
    }

    const initialLoan = {
        id: loan.id,
        clientId: loan.clientId,
        amount: Number(loan.amount),
        months: Number(loan.months ?? 0),
        startDate: loan.startDate.toISOString().slice(0, 10),
        endDate: loan.endDate ? loan.endDate.toISOString().slice(0, 10) : "",
        markupPercent: Number(loan.markupPercent ?? 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
            <header className="mx-auto max-w-6xl px-6 pt-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold">
                            Editar préstamo
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Modifica el importe, las fechas o los meses. El sistema actualizará
                            automáticamente los días totales y el % de recargo simple para recalcular
                            el total a devolver.
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
                    mode="edit"
                    initialLoan={initialLoan}
                />
            </main>
        </div>
    );
}
