"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function DeleteAccountButton({ email }: { email: string }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handler = () => setOpen(true);
        window.addEventListener("open-delete-account", handler as EventListener);
        return () => window.removeEventListener("open-delete-account", handler as EventListener);
    }, []);

    function close() {
        setOpen(false);
    }

    async function onDelete() {
        // tu lógica de borrado (fetch a /api/account/delete, etc.)
        // si ya la tienes, reutilízala aquí
    }

    // Si también quieres mantener el botón visible en alguna parte:
    // return <button onClick={() => setOpen(true)}>Eliminar cuenta</button>

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
        />

        {/* Card centrada */}
        <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
            <h2 className="text-xl font-semibold text-gray-800">Eliminar cuenta</h2>
            <p className="mt-1 text-sm text-gray-600">
                Se eliminará tu cuenta (<span className="font-medium">{email}</span>) y <b>todos los datos asociados</b>:
                clientes, préstamos, cuotas, sesiones… Esta acción es <span className="text-rose-600 font-semibold">irreversible</span>.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
                ⚠️ Asegúrate de haber exportado o guardado cualquier información que necesites.
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
                <button
                onClick={close}
                className="rounded-xl border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
                >
                Cancelar
                </button>
                <button
                onClick={onDelete}
                className="rounded-xl bg-rose-600 text-white px-4 py-2 font-semibold hover:bg-rose-700"
                >
                Eliminar cuenta
                </button>
            </div>
            </div>
        </div>
        </div>,
        document.body
    );
}
