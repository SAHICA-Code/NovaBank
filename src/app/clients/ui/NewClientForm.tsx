"use client";

import { useState } from "react";

export default function NewClientForm() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState(""); // <- antes email
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    async function create(e?: React.FormEvent) {
        e?.preventDefault();
        if (!name.trim()) {
        alert("El nombre es obligatorio");
        return;
        }
        setLoading(true);
        try {
        const res = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description, phone }), // <- enviar description
        });
        if (res.ok) {
            setName("");
            setDescription("");
            setPhone("");
            location.reload();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo crear el cliente");
        }
        } finally {
        setLoading(false);
        }
    }

    return (
        <form
        onSubmit={create}
        className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4 shadow-sm grid gap-3 sm:grid-cols-4"
        >
        <input
            className="rounded-xl border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-300 px-3 py-2 outline-none bg-white/70"
            placeholder="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
        />

        {/* Sustituido Email -> Descripción */}
        <input
            className="rounded-xl border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-300 px-3 py-2 outline-none bg-white/70"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
        />

        <input
            className="rounded-xl border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-300 px-3 py-2 outline-none bg-white/70"
            placeholder="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
        />

        <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-500 text-white px-4 py-2 font-medium shadow-sm hover:brightness-110 disabled:opacity-60 transition"
        >
            {loading ? "Añadiendo..." : "Añadir"}
        </button>
        </form>
    );
}
