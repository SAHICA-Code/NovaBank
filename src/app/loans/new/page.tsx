import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewLoanForm from "./ui/NewLoanForm";

export const dynamic = "force-dynamic";

export default async function NewLoanPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true },
    });
    if (!user) redirect("/auth/login");

    const clients = await prisma.client.findMany({
        where: { ownerId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        <header className="mx-auto max-w-6xl px-6 pt-8">
            <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Nuevo préstamo</h1>
                <p className="text-gray-500 mt-1">
                Define el importe, los meses, el <b>% de recargo simple</b> (no TAE) y la fecha de inicio.
                El total a devolver será <code>importe × (1 + %/100)</code>.
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
            <NewLoanForm clients={clients} />
        </main>
        </div>
    );
}
