"use client";

import { useState } from "react";

type Props = {
    client: {
        id: string;
        name: string;
        description: string | null;
        phone: string | null;
    };
    };

    export default function EditClientButton({ client }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(client.name);
    const [description, setDescription] = useState(client.description ?? "");
    const [phone, setPhone] = useState(client.phone ?? "");
    const [loading, setLoading] = useState(false);

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
        alert("El nombre es obligatorio");
        return;
        }
        setLoading(true);
        try {
        const res = await fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            phone: phone.trim() || null,
            }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo actualizar");
            return;
        }
        setOpen(false);
        // refrescamos lista
        location.reload();
        } finally {
        setLoading(false);
        }
    }

    return (
        <>
        <button
            onClick={() => setOpen(true)}
            className="text-indigo-600 hover:text-indigo-700 text-sm"
        >
            Editar
        </button>

        {open && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Editar cliente</h3>
                <button
                    onClick={() => setOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Cerrar"
                >
                    ✕
                </button>
                </div>

                <form onSubmit={onSave} className="grid gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Nombre"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Descripción / notas"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Teléfono"
                    />
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                    Cancelar
                    </button>
                    <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                    >
                    {loading ? "Guardando..." : "Guardar"}
                    </button>
                </div>
                </form>
            </div>
            </div>
        )}
        </>
    );
}
