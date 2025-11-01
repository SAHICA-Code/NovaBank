"use client";
import { useState } from "react";

export default function DeleteClientButton({ id }: { id: string }) {
    const [loading, setLoading] = useState(false);

    async function onDelete() {
        if (!confirm("¿Eliminar cliente? Se eliminarán sus préstamos y cuotas.")) return;
        setLoading(true);
        try {
        const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
        if (res.ok) {
            location.reload();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo eliminar");
        }
        } finally {
        setLoading(false);
        }
    }

    return (
        <button
        onClick={onDelete}
        disabled={loading}
        className="text-red-600 text-sm hover:underline disabled:opacity-50"
        title="Eliminar cliente"
        >
        {loading ? "Eliminando..." : "Eliminar"}
        </button>
    );
}
