// src/app/loans/new/ui/NewLoanForm.tsx
"use client";

import { useMemo, useState, useEffect } from "react";

type ClientOpt = { id: string; name: string };

export default function NewLoanForm({ clients }: { clients: ClientOpt[] }) {
    const [clientId, setClientId] = useState(clients[0]?.id ?? "");
    const [amount, setAmount] = useState<string>("");

    const [months, setMonths] = useState<string>(""); // meses totales
    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState<string>(""); // fecha final opcional

    const [daysBetween, setDaysBetween] = useState<number>(0);

    const [markupPct, setMarkupPct] = useState<string>(""); // % recargo
    const [markupFactor, setMarkupFactor] = useState<string>("1.5"); // factor para días × factor
    const [markupTouched, setMarkupTouched] = useState(false); // si el usuario ha tocado el %

    const [loading, setLoading] = useState(false);

    // ---- helpers de formato

    // Sólo dígitos, sin ceros a la izquierda (pero permite vacío)
    function sanitizeIntInput(raw: string) {
        let v = raw.replace(/\D/g, "");
        v = v.replace(/^0+(?=\d)/, "");
        return v;
    }

    // Porcentaje decimal: permite coma/punto; quita ceros a la izquierda salvo "0.".
    function sanitizePercentInput(raw: string) {
        let v = raw.replace(/[^\d.,]/g, "");
        v = v.replace(",", ".");
        const parts = v.split(".");
        if (parts.length > 2) {
        v = parts[0] + "." + parts.slice(1).join("");
        }
        if (v.startsWith("0") && !v.startsWith("0.") && v.length > 1) {
        v = v.replace(/^0+(?=\d)/, "");
        }
        return v;
    }

    function normalizeIntOnBlur(v: string) {
        if (v === "") return "";
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? String(n) : "";
    }

    function normalizePctOnBlur(v: string) {
        if (v === "") return "";
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) ? String(n) : "";
    }

    // ---- cálculo días, meses y % automático a partir de fechas

    function recomputeFromDates(nextStart: string, nextEnd: string) {
        if (!nextStart || !nextEnd) {
        setDaysBetween(0);
        return;
        }

        const start = new Date(nextStart);
        const end = new Date(nextEnd);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        setDaysBetween(0);
        return;
        }

        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        setDaysBetween(diffDays);

        // Si el usuario no ha escrito los meses, los calculamos aprox.
        if (!months) {
        const approxMonths = Math.max(1, Math.round(diffDays / 30));
        setMonths(String(approxMonths));
        }

        // Si el usuario NO ha tocado manualmente el %,
        // lo calculamos como días × factor.
        if (!markupTouched) {
        const f = Number(markupFactor.replace(",", ".") || 0);
        const pct = diffDays * f;
        if (pct > 0) {
            setMarkupPct(String(Math.round(pct)));
        }
        }
    }

    // Recalcular cuando cambien fechas
    useEffect(() => {
        recomputeFromDates(startDate, endDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    // Recalcular % cuando cambie el factor (si hay días y el usuario no tocó el %)
    useEffect(() => {
        if (!daysBetween || markupTouched) return;
        const f = Number(markupFactor.replace(",", ".") || 0);
        const pct = daysBetween * f;
        if (pct > 0) {
        setMarkupPct(String(Math.round(pct)));
        }
    }, [daysBetween, markupFactor, markupTouched]);

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
        if (!m || m <= 0)
        return alert(
            "Meses inválidos. Indica los meses o selecciona una fecha final válida."
        );
        if (p < 0) return alert("El % de recargo no puede ser negativo");

        // Validar fechas coherentes si hay fecha final
        if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            return alert("La fecha final no puede ser anterior a la fecha de inicio.");
        }
        }

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
            // endDate no se envía porque las cuotas se generan por meses
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
        <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4 shadow-sm space-y-4"
        >
        {/* fila 1: cliente + fecha inicio / fin */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
            >
                {clients.map((c) => (
                <option key={c.id} value={c.id}>
                    {c.name}
                </option>
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

            <div>
            <label className="block text-sm font-medium mb-1">
                Fecha final (opcional)
            </label>
            <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {daysBetween > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                Duración: <b>{daysBetween} días</b>{" "}
                {months && (
                    <>
                    {" "}
                    · Aproximadamente <b>{months} meses</b>
                    </>
                )}
                </p>
            )}
            </div>
        </div>

        {/* fila 2: importe + meses + recargo + factor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
            <label className="block text-sm font-medium mb-1">Importe (€)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="100"
                value={amount}
                onChange={(e) => {
                let v = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
                const parts = v.split(".");
                if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
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
            <label className="block text-sm font-medium mb-1">
                Meses (o se calculan desde la fecha final)
            </label>
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
            <label className="block text-sm font-medium mb-1">
                % Recargo (simple)
            </label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="50"
                value={markupPct}
                onChange={(e) => {
                setMarkupTouched(true);
                setMarkupPct(sanitizePercentInput(e.target.value));
                }}
                onBlur={(e) => setMarkupPct(normalizePctOnBlur(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {daysBetween > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                Sugerido desde días × factor. Ahora:{" "}
                <code>
                    {daysBetween} × {markupFactor || "1.5"}
                </code>
                </p>
            )}
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">
                Factor (días × factor)
            </label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="1.5"
                value={markupFactor}
                onChange={(e) =>
                setMarkupFactor(sanitizePercentInput(e.target.value))
                }
                onBlur={(e) =>
                setMarkupFactor(normalizePctOnBlur(e.target.value))
                }
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>
        </div>

        {/* preview */}
        <div className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 space-y-0.5">
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
