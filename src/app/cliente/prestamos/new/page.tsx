// src/app/cliente/prestamos/new/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import { addMonths } from "date-fns";
import { ClientLoanType } from "@prisma/client";

async function createManualLoan(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    const userId = session.user.id;

    const profile = await prisma.clientProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) throw new Error("No existe ClientProfile para este usuario.");

    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "OTHER") as ClientLoanType;
    const startDate = new Date(
        String(formData.get("startDate") || new Date().toISOString().slice(0, 10))
    );
    const months = parseInt(String(formData.get("months") || "0"), 10);
    const monthlyPayment = Number(String(formData.get("monthlyPayment") || "0").replace(",", "."));
    const monthlyExtras = Number(String(formData.get("monthlyExtras") || "0").replace(",", "."));

    if (!title || !months || !monthlyPayment) {
        throw new Error("Faltan campos obligatorios: título, meses o cuota mensual.");
    }

    await prisma.$transaction(async (tx) => {
        const loan = await tx.clientLoan.create({
        data: {
            userId,
            profileId: profile.id,
            title,
            type,
            startDate,
            months,
            monthlyPayment,
            monthlyExtras: monthlyExtras || null,
        },
        select: { id: true },
        });

        const rows = Array.from({ length: months }).map((_, i) => {
        const dueDate = addMonths(startDate, i);
        const amount = monthlyPayment + (monthlyExtras || 0);
        return {
            loanId: loan.id,
            userId,
            profileId: profile.id,
            title,
            dueDate,
            amount,
            status: "PENDING" as const,
        };
        });

        await tx.clientInstallment.createMany({ data: rows });
    });

    revalidatePath("/cliente");
    redirect("/cliente");
    }

    export default async function NewLoanPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50">
        {/* HEADER */}
        <header className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <Image src="/logo.png" alt="Logo Nova Bank" fill className="object-contain rounded-xl" priority />
                </div>
                <div>
                <h1 className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight">
                    Nuevo préstamo
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 -mt-0.5">
                    Crea tu préstamo personal y generaremos las cuotas automáticamente
                </p>
                </div>
            </div>

            <Link
                href="/cliente"
                className="rounded-xl border-2 border-sky-300 bg-white/80 px-4 py-2 font-medium shadow-sm hover:bg-sky-50 transition text-sm"
            >
                Volver al panel
            </Link>
            </div>
        </header>

        {/* FORM */}
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
            <form
            action={createManualLoan}
            className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur shadow-sm p-5 sm:p-6 space-y-5"
            >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm">
                <span className="block mb-1">Título</span>
                <input
                    name="title"
                    required
                    placeholder="Hipoteca piso, Coche, etc."
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                </label>

                <label className="text-sm">
                <span className="block mb-1">Tipo</span>
                <select
                    name="type"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    defaultValue="OTHER"
                >
                    <option value="MORTGAGE">Hipoteca</option>
                    <option value="CAR">Coche</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="STUDENT">Estudios</option>
                    <option value="OTHER">Otro</option>
                </select>
                </label>

                <label className="text-sm">
                <span className="block mb-1">Fecha de inicio</span>
                <input
                    name="startDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="text-sm">
                <span className="block mb-1">Meses</span>
                <input
                    name="months"
                    type="number"
                    min={1}
                    required
                    placeholder="Ej. 240"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                </label>

                <label className="text-sm">
                <span className="block mb-1">Cuota mensual (€)</span>
                <input
                    name="monthlyPayment"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    placeholder="Ej. 400"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                </label>

                <label className="text-sm">
                <span className="block mb-1">Extras mensuales (€)</span>
                <input
                    name="monthlyExtras"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                </label>
            </div>

            <div className="rounded-xl bg-indigo-50/60 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
                Consejo: si tienes seguros, IBI o mantenimiento, ponlo en “Extras mensuales” para ver el coste real.
            </div>

            <div className="flex items-center gap-3 pt-1">
                <button
                type="submit"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 font-medium shadow-sm transition"
                >
                Crear préstamo
                </button>
                <Link href="/cliente" className="text-sm text-gray-700 underline underline-offset-2 hover:no-underline">
                Cancelar
                </Link>
            </div>
            </form>
        </main>
        </div>
    );
}
