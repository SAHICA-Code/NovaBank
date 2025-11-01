"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ChangePasswordModal() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);

        const openHandler = () => setOpen(true);
        const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
        };

        window.addEventListener("open-change-password", openHandler as EventListener);
        window.addEventListener("keydown", escHandler);

        return () => {
        window.removeEventListener("open-change-password", openHandler as EventListener);
        window.removeEventListener("keydown", escHandler);
        };
    }, []);

    function close() {
        setOpen(false);
        setMsg(null);
        setErr(null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setErr(null);

        if (newPassword !== confirm) return setErr("Las contraseñas no coinciden.");
        if (newPassword.length < 8) return setErr("La contraseña debe tener al menos 8 caracteres.");

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
        // Cierra solo después de un pequeño feedback
        setTimeout(close, 1000);
        } catch (e: any) {
        setErr(e.message);
        } finally {
        setLoading(false);
        }
    }

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

        {/* Card centrada */}
        <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
            <h2 className="text-xl font-semibold text-gray-800">Cambiar contraseña</h2>
            <p className="mt-1 text-sm text-gray-600">Introduce tu contraseña actual y la nueva.</p>

            {err && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{err}</div>
            )}
            {msg && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm p-3">
                {msg}
                </div>
            )}

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <div>
                <label className="block text-sm font-medium mb-1">Contraseña actual</label>
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="(déjala vacía si no tenías)"
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
                    onClick={close}
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
        </div>,
        document.body
    );
}
