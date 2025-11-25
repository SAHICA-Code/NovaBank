"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSignOut() {
        setLoading(true);
        try {
        await signOut({ callbackUrl: "/" }); // gestiona CSRF y redirige a /
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50 px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-lg border border-black/5 text-center">
            {/* Logo y marca */}
            <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-2">
                <Image
                src="/logo.png"
                alt="Logo Nova Bank"
                fill
                className="object-contain"
                priority
                />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 tracking-tight">
                Nova Bank
            </h1>
            <p className="text-sm text-gray-500 mt-1">Cerrar sesión</p>
            </div>

            {/* Aviso */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm p-3 mb-4 text-left">
            Estás a punto de cerrar tu sesión. Asegúrate de haber guardado tus cambios.
            </div>

            {/* Botones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
                onClick={() => router.back()}
                className="rounded-xl border px-4 py-2.5 font-medium hover:bg-gray-50 transition"
                disabled={loading}
            >
                Cancelar
            </button>
            <button
                onClick={handleSignOut}
                disabled={loading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-medium transition disabled:opacity-60"
            >
                {loading ? "Saliendo..." : "Cerrar sesión"}
            </button>
            </div>

            <p className="mt-5 text-[11px] text-gray-400">
            &copy; 2025 SAHICA | Web hecha por Sara de <b> <a href="https://sahica.com" >SAHICA </a> </b> | admin@sahica.com
            </p>
        </div>
        </div>
    );
}
