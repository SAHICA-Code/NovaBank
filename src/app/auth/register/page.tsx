"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
        // Ajusta esta ruta si tu endpoint de registro es distinto:
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name || null, email, password }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo crear la cuenta");
            return;
        }

        // Inicia sesión automáticamente tras registrarse
        await signIn("credentials", {
            email,
            password,
            callbackUrl: "/dashboard",
        });
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50 px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-lg border border-black/5 text-center">
            {/* Logo y título */}
            <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-2">
                <Image
                src="/logo.png"             // asegúrate de tener /public/logo.png
                alt="Logo novabank"
                fill
                className="object-contain"
                priority
                />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 tracking-tight">
                Nova Bank
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                Empieza a gestionar tus préstamos en minutos
            </p>
            </div>

            {/* Formulario */}
            <form onSubmit={onSubmit} className="space-y-4 text-left">
            <div>
                <label className="block text-sm font-medium mb-1">
                Nombre (opcional)
                </label>
                <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

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

            <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60"
            >
                {loading ? "Creando..." : "Registrarme"}
            </button>
            </form>

            <p className="mt-4 text-sm text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <a href="/auth/login" className="text-indigo-600 font-medium hover:underline">
                Inicia sesión
            </a>
            </p>
        </div>
        </div>
    );
}
