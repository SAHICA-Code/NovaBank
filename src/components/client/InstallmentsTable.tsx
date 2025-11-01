// src/components/client/InstallmentsTable.tsx
"use client";

import { useTransition } from "react";

type Installment = {
    id: string;
    dueDate: string | Date;
    amount: number;
    status: "PENDING" | "PAID" | "PARTIAL";
    };

    type Props = {
    installments: Installment[];
    onMarkPaid: (id: string) => Promise<void>;
    };

    export default function InstallmentsTable({ installments, onMarkPaid }: Props) {
    const [pending, startTransition] = useTransition();

    return (
        <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-gray-50">
            <tr>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-right px-4 py-2">Importe</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-right px-4 py-2">Acciones</th>
            </tr>
            </thead>
            <tbody>
            {installments.map((i) => (
                <tr key={i.id} className="border-t">
                <td className="px-4 py-2">
                    {new Date(i.dueDate).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-2 text-right">
                    {Number(i.amount).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                    })}
                </td>
                <td className="px-4 py-2">
                    {i.status === "PAID" ? (
                    <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                        Pagado
                    </span>
                    ) : i.status === "PARTIAL" ? (
                    <span className="inline-block rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                        Parcial
                    </span>
                    ) : (
                    <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                        Pendiente
                    </span>
                    )}
                </td>
                <td className="px-4 py-2 text-right">
                    {i.status !== "PAID" && (
                    <button
                        disabled={pending}
                        onClick={() =>
                        startTransition(async () => {
                            await onMarkPaid(i.id);
                        })
                        }
                        className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                        {pending ? "..." : "Marcar pagado"}
                    </button>
                    )}
                </td>
                </tr>
            ))}
            {installments.length === 0 && (
                <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No hay cuotas registradas.
                </td>
                </tr>
            )}
            </tbody>
        </table>
        </div>
    );
}
