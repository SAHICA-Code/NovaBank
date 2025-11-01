"use client";

import { useEffect, useRef, useState } from "react";

export default function UserMenu({ email }: { email: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClick(e: MouseEvent) {
        if (!ref.current) return;
        if (!ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    function openChangePassword() {
        window.dispatchEvent(new CustomEvent("open-change-password"));
        setOpen(false);
    }
    function openDelete() {
        window.dispatchEvent(new CustomEvent("open-delete-account"));
        setOpen(false);
    }

    return (
        <div className="relative inline-block text-left" ref={ref}>
        <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-indigo-700 font-medium underline underline-offset-2 hover:text-indigo-800"
            aria-haspopup="menu"
            aria-expanded={open}
            title={email}
        >
            {email}
        </button>

        {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5 p-2 z-50">
            <button
                onClick={openChangePassword}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-indigo-50 text-gray-700"
                role="menuitem"
            >
                🔒 Cambiar contraseña
            </button>

            <button
                onClick={openDelete}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
                role="menuitem"
            >
                🗑️ Eliminar cuenta
            </button>
            </div>
        )}
        </div>
    );
}
