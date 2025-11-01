"use client";

import { useState, useRef } from "react";

export default function ImportXlsx() {
    const [msg, setMsg] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const fd = new FormData();
        fd.append("file", file);

        setMsg("Importando...");
        try {
        const res = await fetch("/api/import/xlsx", {
            method: "POST",
            body: fd,
        });

        const data = await res.json();
        if (!res.ok) {
            setMsg(data?.error ?? "Error importando");
            return;
        }

        setMsg(
            `✅ Importación completada:
            Clientes nuevos: ${data.report.createdClients},
            Préstamos actualizados: ${data.report.upsertedLoans},
            Cuotas creadas: ${data.report.createdPayments},
            Cuotas reemplazadas: ${data.report.replacedPayments}`
        );

        // Recargar datos tras 2 segundos
        setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
        console.error(err);
        setMsg("Error al importar el archivo.");
        }
    }

    function triggerFileSelect() {
        fileInputRef.current?.click();
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-2">
        {/* Botón visible */}
        <button
            type="button"
            onClick={triggerFileSelect}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium shadow-sm transition"
        >
            Importar Excel
        </button>

        {/* Input oculto */}
        <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileSelect}
            className="hidden"
        />

        {msg && (
            <span className="text-sm text-gray-600 whitespace-pre-line mt-1 sm:mt-0">
            {msg}
            </span>
        )}
        </div>
    );
}
