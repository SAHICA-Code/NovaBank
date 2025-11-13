// src/app/loans/new/ui/NewLoanForm.tsx
"use client";

import { useMemo, useState, useEffect } from "react";

type ClientOpt = { id: string; name: string };

type Mode = "create" | "edit";

type InitialLoan = {
    id: string;
    clientId: string;
    amount: number;
    months: number;
    startDate: string;        // "YYYY-MM-DD"
    endDate?: string;         // "YYYY-MM-DD" o ""
    markupPercent: number;    // % que ya tiene el préstamo
    };

    type Props = {
    clients: ClientOpt[];
    mode?: Mode;              // por defecto "create"
    initialLoan?: InitialLoan;
    };

    export default function NewLoanForm({
    clients,
    mode = "create",
    initialLoan,
    }: Props) {
    const isEdit = mode === "edit";

    const [clientId, setClientId] = useState(
        initialLoan?.clientId ?? clients[0]?.id ?? ""
    );
    const [amount, setAmount] = useState<string>(
        initialLoan ? String(initialLoan.amount) : ""
    );

    const [months, setMonths] = useState<string>(
        initialLoan ? String(initialLoan.months) : ""
    );
    const [monthsTouched, setMonthsTouched] = useState<boolean>(!!initialLoan);

    const [startDate, setStartDate] = useState<string>(
        initialLoan?.startDate ?? new Date().toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState<string>(initialLoan?.endDate ?? "");

    const [daysBetween, setDaysBetween] = useState<number>(0);

    // markupFactor inicial: si estamos editando e inicialLoan trae % y fechas,
    // intentamos reconstruir el factor = markupPercent / días
    const [markupFactor, setMarkupFactor] = useState<string>(() => {
        if (
        initialLoan &&
        initialLoan.startDate &&
        initialLoan.endDate
        ) {
        const start = new Date(initialLoan.startDate);
        const end = new Date(initialLoan.endDate);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
            const f = initialLoan.markupPercent / diffDays;
            if (Number.isFinite(f) && f > 0) {
            return f.toFixed(2).replace(/\.?0+$/, "");
            }
        }
        }
        return "1.5";
    });

    const [loading, setLoading] = useState(false);

    // ---- helpers de formato

    function sanitizeDecimalInput(raw: string) {
        let v = raw.replace(/[^\d.,]/g, "").replace(",", ".");
        const parts = v.split(".");
        if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
        if (v.startsWith("0") && !v.startsWith("0.") && v.length > 1) {
        v = v.replace(/^0+(?=\d)/, "");
        }
        return v;
    }

    function normalizeDecimalOnBlur(v: string) {
        if (v === "") return "";
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : "";
    }

    // ---- cálculo días + meses automáticos a partir de fechas

    function recomputeFromDates(
        nextStart: string,
        nextEnd: string,
        monthsTouchedFlag: boolean
    ) {
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

        // Si el usuario NO ha tocado los meses, los calculamos como días/30
        if (!monthsTouchedFlag) {
        const monthsDec = diffDays / 30;
        const str = monthsDec
            .toFixed(2)
            .replace(/\.?0+$/, "");
        setMonths(str);
        }
    }

    // Recalcular al cambiar fechas
    useEffect(() => {
        recomputeFromDates(startDate, endDate, monthsTouched);
    }, [startDate, endDate, monthsTouched]);

    // Si el usuario escribe los meses, recalculamos la fecha final
    useEffect(() => {
        if (!monthsTouched || !months || !startDate) return;

        const m = Number(months);
        if (!Number.isFinite(m) || m <= 0) return;

        const daysFromMonths = Math.round(m * 30);
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + daysFromMonths);

        const newEndISO = end.toISOString().slice(0, 10);
        if (newEndISO !== endDate) {
        setEndDate(newEndISO);
        }
    }, [months, monthsTouched, startDate, endDate]);

    // ---- % recargo calculado = días × factor
    const { markupPercent, totalToRepay, approxMonthly } = useMemo(() => {
        const a = Number(amount || 0);
        const f = Number(markupFactor.replace(",", ".") || 0);
        const pctNumber = daysBetween > 0 && f > 0 ? daysBetween * f : 0;

        const m = Number(months || 0);
        const total = a * (1 + pctNumber / 100);
        const monthly = m > 0 ? total / m : 0;

        return {
        markupPercent: isFinite(pctNumber) ? pctNumber : 0,
        totalToRepay: isFinite(total) ? total : 0,
        approxMonthly: isFinite(monthly) ? monthly : 0,
        };
    }, [amount, markupFactor, daysBetween, months]);

    // ---- submit
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const a = Number(amount);
        const m = Number(months);
        const p = markupPercent;

        if (!clientId) return alert("Selecciona un cliente");
        if (!a || a <= 0) return alert("Importe inválido");
        if (!m || m <= 0)
        return alert(
            "Meses inválidos. Indica los meses o selecciona una fecha final válida."
        );
        if (p < 0) return alert("El % de recargo no puede ser negativo");

        if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            return alert("La fecha final no puede ser anterior a la fecha de inicio.");
        }
        }

        setLoading(true);
        try {
        const url =
            isEdit && initialLoan
            ? `/api/loans/${initialLoan.id}`
            : "/api/loans";

        const method = isEdit && initialLoan ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            clientId,
            amount: a,
            months: m,
            markupPercent: p,
            startDate,
            endDate: endDate || null,
            }),
        });

        if (res.ok) {
            window.location.href = "/payments";
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data?.error ?? "No se pudo guardar el préstamo");
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
                onChange={(e) => {
                setStartDate(e.target.value);
                }}
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
                onChange={(e) => {
                setEndDate(e.target.value);
                setMonthsTouched(false);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {daysBetween > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                Duración: <b>{daysBetween} días</b>
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

        {/* fila 2: importe + meses + % calculado + factor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
            <label className="block text-sm font-medium mb-1">Importe (€)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="100"
                value={amount}
                onChange={(e) => {
                let v = sanitizeDecimalInput(e.target.value);
                setAmount(v);
                }}
                onBlur={(e) => setAmount(normalizeDecimalOnBlur(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">
                Meses (o se calculan desde la fecha final)
            </label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="0.5"
                value={months}
                onChange={(e) => {
                setMonthsTouched(true);
                setMonths(sanitizeDecimalInput(e.target.value));
                }}
                onBlur={(e) => setMonths(normalizeDecimalOnBlur(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">
                % Recargo (automático)
            </label>
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm flex items-center">
                <span className="font-semibold">
                {markupPercent.toFixed(2)} %
                </span>
            </div>
            {daysBetween > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                Calculado como{" "}
                <code>
                    {daysBetween} días × {markupFactor || "1.5"}
                </code>
                .
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
                setMarkupFactor(sanitizeDecimalInput(e.target.value))
                }
                onBlur={(e) =>
                setMarkupFactor(normalizeDecimalOnBlur(e.target.value))
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
            Cuota aprox.: {approxMonthly.toFixed(2)} €
            </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
            {loading
            ? isEdit
                ? "Guardando..."
                : "Creando..."
            : isEdit
            ? "Guardar cambios"
            : "Crear préstamo"}
        </button>
        </form>
  );
}
