"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordModal() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setErr(null);

        if (newPassword !== confirm) return setErr("Las contraseñas no coinciden.");
        if (newPassword.length < 8)
        return setErr("La contraseña debe tener al menos 8 caracteres.");

        setLoading(true);
        try {
        const res = await fetch("/api/account/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Error al cambiar la contraseña.");

        setMsg("✅ Contraseña actualizada correctamente.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
        } catch (e: any) {
        setErr(e.message);
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100]">
        {/* Fondo difuminado */}
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => router.push("/dashboard")}
        />

        {/* Modal centrado */}
        <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
            <h2 className="text-xl font-semibold text-gray-800">Cambiar contraseña</h2>
            <p className="mt-1 text-sm text-gray-600">
                Introduce tu contraseña actual y la nueva que deseas usar.
            </p>

            {/* Mensajes */}
            {err && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">
                {err}
                </div>
            )}
            {msg && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm p-3">
                {msg}
                </div>
            )}

            {/* Formulario */}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <div>
                <label className="block text-sm font-medium mb-1">Contraseña actual</label>
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                </div>

                <div>
                <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
                <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                </div>

                <div>
                <label className="block text-sm font-medium mb-1">Repite la nueva contraseña</label>
                <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="rounded-xl border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                    {loading ? "Guardando..." : "Guardar cambios"}
                </button>
                </div>
            </form>
            </div>
        </div>
        </div>
    );
}
