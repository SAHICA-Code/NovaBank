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
        amount: number;
        markupPercent: number;
    };
    paidAmount?: number;
    remaining?: number;
};

type SortField = "client" | "dueDate" | "invested" | null;
type SortDir = "asc" | "desc";

export default function PaymentsList({ initial }: { initial: Payment[] }) {
    const [payments, setPayments] = useState(initial);

    const [sortBy, setSortBy] = useState<SortField>("dueDate");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const [partialInputs, setPartialInputs] = useState<Record<string, string>>({});

    function updateInput(id: string, value: string) {
        setPartialInputs((prev) => ({ ...prev, [id]: value }));
    }

    async function registerPartialPay(paymentId: string) {
        const raw = partialInputs[paymentId];
        if (!raw) return alert("Introduce una cantidad válida");

        const amount = Number(raw);
        if (!amount || amount <= 0) return alert("Cantidad inválida");

        const res = await fetch(`/api/payments/${paymentId}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return alert(data.error ?? "No se pudo registrar el pago.");
        }

        const updated = await res.json();

        setPayments((prev) =>
            prev.map((p) =>
                p.id === paymentId
                    ? { ...p, ...updated }
                    : p
            )
        );

        setPartialInputs((prev) => ({ ...prev, [paymentId]: "" }));
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
                const na = a.loan.client.name.toLocaleLowerCase("es");
                const nb = b.loan.client.name.toLocaleLowerCase("es");
                if (na < nb) return sortDir === "asc" ? -1 : 1;
                if (na > nb) return sortDir === "asc" ? 1 : -1;
                return 0;
            }

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
            <table className="w-full text-sm min-w-[900px]">
                <thead>
                    <tr className="text-gray-600 border-b">
                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("client")}
                                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-indigo-700"
                            >
                                Cliente {sortIndicator("client")}
                            </button>
                        </th>

                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("dueDate")}
                                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-indigo-700"
                            >
                                Vencimiento {sortIndicator("dueDate")}
                            </button>
                        </th>

                        <th className="text-left py-2">
                            <button
                                type="button"
                                onClick={() => handleSort("invested")}
                                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-indigo-700"
                            >
                                Invertido {sortIndicator("invested")}
                            </button>
                        </th>

                        <th className="text-left py-2">% Recargo</th>
                        <th className="text-left py-2">Importe</th>
                        <th className="text-left py-2">Estado</th>
                        <th className="text-left py-2">Pagar</th>
                        <th className="text-left py-2"></th>
                    </tr>
                </thead>

                <tbody>
                    {sortedPayments.map((p) => {
                        const remaining =
                            p.remaining !== undefined ? p.remaining : p.amount;

                        return (
                            <tr
                                key={p.id}
                                className="border-b last:border-0 hover:bg-indigo-50/40 transition"
                            >
                                <td className="py-2">{p.loan.client.name}</td>
                                <td className="py-2">
                                    {format(new Date(p.dueDate), "d 'de' MMMM yyyy", { locale: es })}
                                </td>
                                <td className="py-2">{p.loan.amount.toFixed(2)} €</td>
                                <td className="py-2">{p.loan.markupPercent}%</td>
                                <td className="py-2">{remaining.toFixed(2)} €</td>

                                <td className="py-2">
                                    {remaining <= 0 || p.status === "PAID" ? (
                                        <span className="rounded-xl bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium">
                                            Pagada
                                        </span>
                                    ) : (
                                        <span className="rounded-xl bg-rose-100 text-rose-700 px-3 py-1 text-xs font-medium">
                                            Pendiente
                                        </span>
                                    )}
                                </td>

                                {/* Input de pago parcial */}
                                <td className="py-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={partialInputs[p.id] ?? ""}
                                        onChange={(e) => updateInput(p.id, e.target.value)}
                                        placeholder="€"
                                        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                                    />
                                </td>

                                {/* Botón pagar */}
                                <td className="py-2 text-right">
                                    <button
                                        onClick={() => registerPartialPay(p.id)}
                                        className="rounded-lg bg-indigo-500 text-white px-3 py-1 text-xs font-medium hover:brightness-110 transition"
                                    >
                                        Registrar
                                    </button>
                                </td>
                            </tr>
                        );
                    })}

                    {payments.length === 0 && (
                        <tr>
                            <td colSpan={8} className="py-6 text-gray-500 text-center">
                                No hay cuotas registradas aún.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
