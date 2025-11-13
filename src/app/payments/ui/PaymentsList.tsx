// src/app/payments/ui/PaymentsList.tsx
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Payment = {
    id: string;
    dueDate: string;
    amount: number;
    status: "PENDING" | "PAID" | "LATE";
    loan: {
        client: { name: string };
        amount: number; // inversión total del préstamo
        markupPercent: number; // % recargo simple
    };
};

type SortField = "dueDate" | "invested" | null;
type SortDir = "asc" | "desc";

export default function PaymentsList({ initial }: { initial: Payment[] }) {
    const [payments, setPayments] = useState(initial);

    const [sortBy, setSortBy] = useState<SortField>("dueDate");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    async function markPaid(id: string) {
        const res = await fetch("/api/payments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            setPayments((prev) =>
                prev.map((p) => (p.id === id ? { ...p, status: "PAID" } : p))
            );
        }
    }

    function handleSort(field: SortField) {
        if (!field) return;
        if (sortBy === field) {
            // si vuelve a pulsar en el mismo campo, cambiamos el sentido
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortDir("asc");
        }
    }

    const sortedPayments = useMemo(() => {
        const data = [...payments];
        if (!sortBy) return data;

        return data.sort((a, b) => {
            if (sortBy === "dueDate") {
                const da = new Date(a.dueDate).getTime();
                const db = new Date(b.dueDate).getTime();
                return sortDir === "asc" ? da - db : db - da;
            }
            if (sortBy === "invested") {
                const ia = a.loan.amount;
                const ib = b.loan.amount;
                return sortDir === "asc" ? ia - ib : ib - ia;
            }
            return 0;
        });
    }, [payments, sortBy, sortDir]);

    const sortIndicator = (field: SortField) => {
        if (sortBy !== field) return null;
        return (
            <span className="ml-1 text-[10px] align-middle">
                {sortDir === "asc" ? "▲" : "▼"}
            </span>
        );
    };

    return (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur shadow-sm p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
                <thead>
                    <tr className="text-gray-600 border-b">
                        <th className="text-left py-2">Cliente</th>

                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("dueDate")}
                                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-indigo-700"
                            >
                                Vencimiento
                                {sortIndicator("dueDate")}
                            </button>
                        </th>

                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("invested")}
                                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-indigo-700"
                            >
                                Invertido
                                {sortIndicator("invested")}
                            </button>
                        </th>

                        <th className="text-left py-2">% Recargo</th>
                        <th className="text-left py-2">Importe</th>
                        <th className="text-left py-2">Estado</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedPayments.map((p) => (
                        <tr
                            key={p.id}
                            className="border-b last:border-0 hover:bg-indigo-50/40 transition"
                        >
                            <td className="py-2">{p.loan.client.name}</td>
                            <td className="py-2">
                                {format(new Date(p.dueDate), "d 'de' MMMM yyyy", {
                                    locale: es,
                                })}
                            </td>
                            <td className="py-2">{p.loan.amount.toFixed(2)} €</td>
                            <td className="py-2">{p.loan.markupPercent}%</td>
                            <td className="py-2">{p.amount.toFixed(2)} €</td>
                            <td className="py-2">
                                {p.status === "PAID" ? (
                                    <span className="rounded-xl bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium">
                                        Pagada
                                    </span>
                                ) : p.status === "LATE" ? (
                                    <span className="rounded-xl bg-rose-200 text-rose-800 px-3 py-1 text-xs font-medium">
                                        Vencida
                                    </span>
                                ) : (
                                    <span className="rounded-xl bg-rose-100 text-rose-700 px-3 py-1 text-xs font-medium">
                                        Pendiente
                                    </span>
                                )}
                            </td>
                            <td className="text-right">
                                {p.status !== "PAID" && (
                                    <button
                                        onClick={() => markPaid(p.id)}
                                        className="rounded-lg bg-indigo-500 text-white px-3 py-1 text-xs font-medium hover:brightness-110 transition"
                                    >
                                        Marcar pagada
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}

                    {payments.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-6 text-gray-500 text-center">
                                No hay cuotas registradas aún.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
