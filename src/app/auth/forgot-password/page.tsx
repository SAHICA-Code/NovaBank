"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setErr(null);
        setLoading(true);
        try {
        const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "No se pudo enviar el enlace.");
        setMsg("Si el email existe, te hemos enviado un enlace para restablecer la contraseña.");
        setEmail("");
        } catch (e: any) {
        setErr(e.message);
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50 px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-lg border border-black/5 text-center">
            {/* Marca */}
            <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-2">
                <Image src="/logo.png" alt="Logo Nova Bank" fill className="object-contain" priority />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 tracking-tight">Nova Bank</h1>
            <p className="text-sm text-gray-500 mt-1">Recuperar contraseña</p>
            </div>

            {/* Alertas */}
            {err && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3 text-left">
                {err}
            </div>
            )}
            {msg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm p-3 text-left">
                {msg}
            </div>
            )}

            {/* Formulario */}
            <form onSubmit={onSubmit} className="space-y-4 text-left">
            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60"
            >
                {loading ? "Enviando..." : "Enviar enlace"}
            </button>
            </form>

            {/* Acciones secundarias */}
            <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
                href="/auth/login"
                className="text-center rounded-xl border border-gray-300 py-2.5 font-medium hover:bg-gray-50 transition"
            >
                Volver a iniciar sesión
            </Link>
            <Link
                href="/"
                className="text-center rounded-xl border border-emerald-400 text-emerald-700 py-2.5 font-medium hover:bg-emerald-50 transition"
            >
                Ir al inicio
            </Link>
            </div>

            {/* Footer */}
            <p className="mt-4 text-xs text-gray-500">© {new Date().getFullYear()} Nova Bank</p>
        </div>
        </div>
    );
}
