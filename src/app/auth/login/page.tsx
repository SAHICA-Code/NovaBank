// src/app/auth/login/page.tsx
"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const error = searchParams.get("error"); // CredentialsSignin, OAuthSignin, etc.
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loadingCreds, setLoadingCreds] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);

    const humanError = useMemo(() => {
        if (error === "CredentialsSignin") {
        return "Email o contraseña incorrectos, o la cuenta no existe.";
        }
        if (error === "OAuthSignin") {
        return "No se pudo iniciar sesión con Google. Revisa la configuración o inténtalo de nuevo.";
        }
        if (error === "OAuthAccountNotLinked") {
        return "Esta dirección ya existe con otro método de inicio de sesión. Entra con ese método.";
        }
        return null;
    }, [error]);

    // Si ya hay sesión y existe callbackUrl, redirige
    useEffect(() => {
        const sessionCookie = document.cookie.includes("next-auth.session-token");
        if (sessionCookie && callbackUrl) router.replace(callbackUrl);
    }, [callbackUrl, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoadingCreds(true);
        try {
        await signIn("credentials", {
            email,
            password,
            callbackUrl, // ← respeta el callbackUrl de la query
            redirect: true,
        });
        } finally {
        setLoadingCreds(false);
        }
    }

    async function handleGoogle() {
        setLoadingGoogle(true);
        try {
        await signIn("google", {
            callbackUrl, // ← respeta el callbackUrl de la query
            redirect: true,
        });
        } finally {
        setLoadingGoogle(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50 px-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-lg border border-black/5 text-center">
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
            <p className="text-sm text-gray-500 mt-1">
                Organiza tus préstamos fácilmente
            </p>
            </div>

            {/* alerta de error */}
            {humanError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3 text-left">
                {humanError}{" "}
                {error === "CredentialsSignin" && (
                <button
                    onClick={() => {
                    const q = email ? `?email=${encodeURIComponent(email)}` : "";
                    router.push(`/auth/register${q}`);
                    }}
                    className="font-medium underline underline-offset-2 hover:text-rose-800 ml-1"
                >
                    Crear cuenta
                </button>
                )}
            </div>
            )}

            {/* Login con credenciales */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
                disabled={loadingCreds || loadingGoogle}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60"
            >
                {loadingCreds ? "Entrando..." : "Entrar"}
            </button>
            </form>

            {/* Google OAuth */}
            <button
            onClick={handleGoogle}
            disabled={loadingGoogle || loadingCreds}
            className="w-full mt-3 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-60"
            >
            {loadingGoogle ? "Conectando con Google..." : "Continuar con Google"}
            </button>

            <p className="mt-4 text-sm text-gray-600">
            ¿No tienes cuenta?{" "}
            <a
                href={`/auth/register${
                email ? `?email=${encodeURIComponent(email)}` : ""
                }`}
                className="text-indigo-600 font-medium hover:underline"
            >
                Crea una gratis
            </a>
            </p>
            <p className="text-center text-sm text-gray-800">
            <a href="/auth/forgot-password" className="underline">
                ¿Has olvidado tu contraseña?
            </a>
            </p>
        </div>
        </div>
    );
    }

    export default function LoginPage() {
    return (
        <Suspense fallback={null}>
        <LoginInner />
        </Suspense>
    );
}
