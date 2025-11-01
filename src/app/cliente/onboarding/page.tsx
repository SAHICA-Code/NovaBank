// src/app/cliente/onboarding/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import ChangePasswordModal from "@/app/dashboard/ui/ChangePasswordModal";
import DeleteAccountButton from "@/app/dashboard/ui/DeleteAccountButton";
import UserMenu from "@/app/dashboard/ui/UserMenu";

async function createClientProfile() {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    const exists = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });

    if (!exists) {
        await prisma.clientProfile.create({ data: { userId: session.user.id } });
    }

    revalidatePath("/cliente");
    redirect("/cliente");
    }

    export default async function ClienteOnboardingPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/auth/login");

    const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    });
    if (profile) redirect("/cliente");

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
                    Activar panel de cliente
                </p>
                </div>
            </div>

            {/* Usuario */}
            <div className="text-center md:text-right px-1">
                <p className="text-[11px] sm:text-xs text-gray-500">Sesión iniciada como</p>
                <UserMenu email={session.user?.email ?? ""} />
            </div>

            {/* Acciones secundarias */}
            <div className="hidden md:block">
                <ChangePasswordModal />
                <DeleteAccountButton email={session.user?.email ?? ""} />
            </div>
            </div>
        </header>

        {/* MAIN */}
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
            <section className="rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-6 sm:p-8 shadow-sm space-y-5">
            <h2 className="text-2xl font-semibold">Activar panel de cliente</h2>
            <p className="text-sm text-gray-600">
                Aún no tienes perfil de cliente. Esto te permitirá añadir tus propios préstamos
                (hipoteca, coche, etc.) y ver tus cuotas mensuales.
            </p>

            <form action={createClientProfile}>
                <button
                type="submit"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-medium transition"
                >
                Crear mi perfil de cliente
                </button>
            </form>

            <div className="pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">
                También puedes volver al panel de empresa.
                </p>
                <Link
                href="/dashboard"
                className="text-sm underline text-indigo-700 hover:text-indigo-800"
                >
                Ir al panel de empresa
                </Link>
            </div>
            </section>

            {/* Acciones móviles: cambiar contraseña / eliminar */}
            <div className="mt-6 md:hidden flex gap-2">
            <ChangePasswordModal />
            <DeleteAccountButton email={session.user?.email ?? ""} />
            </div>
        </main>
        </div>
    );
}
