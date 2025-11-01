// src/components/client/LoanForm.tsx
"use client";

import { useState, useTransition } from "react";

type Props = {
    onSubmit: (formData: FormData) => Promise<void>;
    };

    export default function LoanForm({ onSubmit }: Props) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
        try {
            await onSubmit(formData);
        } catch (err: any) {
            setError(err.message || "Error al crear el préstamo");
        }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        <div className="grid grid-cols-1 gap-4">
            <label className="text-sm">
            <span className="block mb-1">Título</span>
            <input
                name="title"
                required
                placeholder="Hipoteca piso, coche, etc."
                className="w-full rounded-md border px-3 py-2"
            />
            </label>

            <label className="text-sm">
            <span className="block mb-1">Tipo</span>
            <select name="type" className="w-full rounded-md border px-3 py-2">
                <option value="MORTGAGE">Hipoteca</option>
                <option value="CAR">Coche</option>
                <option value="PERSONAL">Personal</option>
                <option value="STUDENT">Estudios</option>
                <option value="OTHER">Otro</option>
            </select>
            </label>

            <label className="text-sm">
            <span className="block mb-1">Fecha de inicio</span>
            <input
                name="startDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border px-3 py-2"
            />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-sm">
                <span className="block mb-1">Meses</span>
                <input
                name="months"
                type="number"
                min={1}
                required
                placeholder="Ej. 240"
                className="w-full rounded-md border px-3 py-2"
                />
            </label>

            <label className="text-sm">
                <span className="block mb-1">Cuota mensual (€)</span>
                <input
                name="monthlyPayment"
                type="number"
                step="0.01"
                min={0}
                required
                placeholder="Ej. 400"
                className="w-full rounded-md border px-3 py-2"
                />
            </label>

            <label className="text-sm">
                <span className="block mb-1">Extras mensuales (€)</span>
                <input
                name="monthlyExtras"
                type="number"
                step="0.01"
                min={0}
                placeholder="Opcional"
                className="w-full rounded-md border px-3 py-2"
                />
            </label>
            </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
            <button
            type="submit"
            disabled={pending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
            {pending ? "Creando..." : "Crear préstamo"}
            </button>
        </div>
        </form>
    );
}
