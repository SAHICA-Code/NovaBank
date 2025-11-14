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
        amount: number;
        markupPercent: number;
    };
};

type SortField = "client" | "dueDate" | "invested" | null;
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
            if (sortBy === "client") {
                const na = a.loan.client.name.toLowerCase();
                const nb = b.loan.client.name.toLowerCase();
                return sortDir === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
            }
            if (sortBy === "dueDate") {
                const da = new Date(a.dueDate).getTime();
                const db = new Date(b.dueDate).getTime();
                return sortDir === "asc" ? da - db : db - da;
            }
            if (sortBy === "invested") {
                return sortDir === "asc"
                    ? a.loan.amount - b.loan.amount
                    : b.loan.amount - a.loan.amount;
            }
            return 0;
        });
    }, [payments, sortBy, sortDir]);

    const sortIndicator = (field: SortField) =>
        sortBy === field ? (
            <span className="ml-1 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
        ) : null;

    return (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur shadow-sm p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
                <thead>
                    <tr className="text-gray-600 border-b">
                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("client")}
                                className="inline-flex items-center text-xs font-medium"
                            >
                                Cliente {sortIndicator("client")}
                            </button>
                        </th>
                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("dueDate")}
                                className="inline-flex items-center text-xs font-medium"
                            >
                                Vencimiento {sortIndicator("dueDate")}
                            </button>
                        </th>
                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("invested")}
                                className="inline-flex items-center text-xs font-medium"
                            >
                                Invertido {sortIndicator("invested")}
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
                        <tr key={p.id} className="border-b hover:bg-indigo-50/40">
                            <td>{p.loan.client.name}</td>
                            <td>
                                {format(new Date(p.dueDate), "d 'de' MMMM yyyy", { locale: es })}
                            </td>
                            <td>{p.loan.amount.toFixed(2)} €</td>
                            <td>{p.loan.markupPercent}%</td>
                            <td>{p.amount.toFixed(2)} €</td>
                            <td>
                                {p.status === "PAID" ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-xl">
                                        Pagada
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs rounded-xl">
                                        Pendiente
                                    </span>
                                )}
                            </td>
                            <td className="text-right">
                                {p.status !== "PAID" && (
                                    <button
                                        onClick={() => markPaid(p.id)}
                                        className="px-3 py-1 bg-indigo-500 text-white text-xs rounded-lg"
                                    >
                                        Marcar pagada
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
