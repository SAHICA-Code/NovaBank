"use client";

import { useState } from "react";
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

    export default function PaymentsList({ initial }: { initial: Payment[] }) {
    const [payments, setPayments] = useState(initial);

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

    return (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur shadow-sm p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
            <thead>
            <tr className="text-gray-600 border-b">
                <th className="text-left py-2">Cliente</th>
                <th className="text-left py-2">Vencimiento</th>
                <th className="text-left py-2">Invertido</th>
                <th className="text-left py-2">% Recargo</th>
                <th className="text-left py-2">Importe</th>
                <th className="text-left py-2">Estado</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
            {payments.map((p) => (
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
