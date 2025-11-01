"use client";

import { useMemo, useState } from "react";

type ClientOpt = { id: string; name: string };

export default function NewLoanForm({ clients }: { clients: ClientOpt[] }) {
    const [clientId, setClientId] = useState(clients[0]?.id ?? "");
    const [amount, setAmount] = useState<string>("");
    const [months, setMonths] = useState<string>("");          // <- sin 0 por defecto
    const [markupPct, setMarkupPct] = useState<string>("");    // <- sin 0 por defecto
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    // ---- helpers de formato

    // Sólo dígitos, sin ceros a la izquierda (pero permite vacío)
    function sanitizeIntInput(raw: string) {
        let v = raw.replace(/\D/g, ""); // sólo números
        // quita ceros a la izquierda si hay más de un dígito
        v = v.replace(/^0+(?=\d)/, "");
        return v;
    }

    // Porcentaje decimal: permite coma/punto; quita ceros a la izquierda salvo "0.".
    function sanitizePercentInput(raw: string) {
        // dejar sólo números y , .
        let v = raw.replace(/[^\d.,]/g, "");
        // usar punto como separador
        v = v.replace(",", ".");
        // evitar más de un punto
        const parts = v.split(".");
        if (parts.length > 2) {
        v = parts[0] + "." + parts.slice(1).join("");
        }
        // quitar ceros a la izquierda salvo caso "0." o "0"
        if (v.startsWith("0") && !v.startsWith("0.") && v.length > 1) {
        v = v.replace(/^0+(?=\d)/, "");
        }
        return v;
    }

    function normalizeIntOnBlur(v: string) {
        if (v === "") return "";
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? String(n) : "";
        // no añadimos 0 cuando está vacío
    }

    function normalizePctOnBlur(v: string) {
        if (v === "") return "";
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) ? String(n) : "";
    }

    // ---- cálculo de totales para el preview
    const { totalToRepay, approxMonthly } = useMemo(() => {
        const a = Number(amount || 0);
        const p = Number(markupPct.replace(",", ".") || 0);
        const m = Number(months || 0);
        const total = a * (1 + p / 100);
        const monthly = m > 0 ? total / m : 0;
        return {
        totalToRepay: isFinite(total) ? total : 0,
        approxMonthly: isFinite(monthly) ? monthly : 0,
        };
    }, [amount, months, markupPct]);

    // ---- submit
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const a = Number(amount);
        const m = Number(months);
        const p = Number(markupPct.replace(",", "."));

        if (!clientId) return alert("Selecciona un cliente");
        if (!a || a <= 0) return alert("Importe inválido");
        if (!m || m <= 0) return alert("Meses inválidos");
        if (p < 0) return alert("El % de recargo no puede ser negativo");

        setLoading(true);
        try {
        const res = await fetch("/api/loans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            clientId,
            amount: a,
            months: m,
            markupPercent: p,
            startDate,
            }),
        });
        if (res.ok) {
            window.location.href = "/payments";
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo crear el préstamo");
        }
        } finally {
        setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4 shadow-sm space-y-4">
        {/* fila 1: cliente + fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
            >
                {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>
        </div>

        {/* fila 2: importe + meses + recargo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
            <label className="block text-sm font-medium mb-1">Importe (€)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="100"
                value={amount}
                onChange={(e) => {
                // permitir decimales con punto/coma, pero sin letras
                let v = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
                // solo un punto
                const parts = v.split(".");
                if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                // sin ceros a la izquierda innecesarios (excepto "0." o vacío)
                if (v.startsWith("0") && !v.startsWith("0.") && v.length > 1) {
                    v = v.replace(/^0+(?=\d)/, "");
                }
                setAmount(v);
                }}
                onBlur={(e) => {
                const v = e.target.value;
                if (v === "") return;
                const n = Number(v);
                setAmount(Number.isFinite(n) ? String(n) : "");
                }}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">Meses</label>
            <input
                type="text"
                inputMode="numeric"
                placeholder="12"
                value={months}
                onChange={(e) => setMonths(sanitizeIntInput(e.target.value))}
                onBlur={(e) => setMonths(normalizeIntOnBlur(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">% Recargo (simple)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="50"
                value={markupPct}
                onChange={(e) => setMarkupPct(sanitizePercentInput(e.target.value))}
                onBlur={(e) => setMarkupPct(normalizePctOnBlur(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>
        </div>

        {/* preview */}
        <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700">
            <div>
            <span className="text-gray-500">Total a devolver: </span>
            <span className="font-semibold">{totalToRepay.toFixed(2)} €</span>
            </div>
            <div className="text-gray-500">
            Cuota aprox.: {approxMonthly.toFixed(2)} € — Ej: 10 € con 50% ⇒ 15 €
            </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
            {loading ? "Creando..." : "Crear préstamo"}
        </button>
        </form>
    );
}
