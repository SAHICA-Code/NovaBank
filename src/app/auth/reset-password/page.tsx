// src/app/auth/reset-password/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordInner() {
    const sp = useSearchParams();
    const router = useRouter();
    const token = sp.get("token") ?? "";
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) setMsg("Enlace inválido.");
    }, [token]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        if (newPassword !== confirm) {
        setMsg("Las contraseñas no coinciden.");
        return;
        }
        setLoading(true);
        try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword }),
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data?.error || "No se pudo cambiar la contraseña");
        setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");
        setTimeout(() => router.push("/auth/login"), 1200);
        } catch (e: any) {
        setMsg(e.message);
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Nueva contraseña</h1>
        <form onSubmit={onSubmit} className="space-y-4">
            <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Nueva contraseña (mín. 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            />
            <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Repite la nueva contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            />
            <button
            className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
            disabled={loading}
            >
            {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
            {msg && <p className="text-sm mt-2">{msg}</p>}
        </form>
        </div>
    );
    }

    export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
        <ResetPasswordInner />
        </Suspense>
    );
}
