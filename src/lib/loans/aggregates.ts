// src/lib/loans/aggregates.ts
import { eachMonthOfInterval, startOfMonth } from "date-fns";

export type Installment = {
    dueDate: Date;
    amount: number;
    status: "PENDING" | "PAID" | "PARTIAL";
    };

    /**
     * Calcula el total mensual a pagar entre dos fechas
     */
    export function monthlyTotals(installments: Installment[], from: Date, to: Date) {
    const months = eachMonthOfInterval({
        start: startOfMonth(from),
        end: startOfMonth(to),
    });

    const map = new Map<number, number>(); // key = YYYYMM

    for (const m of months) {
        const key = m.getFullYear() * 100 + (m.getMonth() + 1);
        map.set(key, 0);
    }

    for (const inst of installments) {
        const key = inst.dueDate.getFullYear() * 100 + (inst.dueDate.getMonth() + 1);
        if (map.has(key) && inst.status !== "PAID") {
        const current = map.get(key) ?? 0;
        map.set(key, Number((current + inst.amount).toFixed(2)));
        }
    }

    return Array.from(map.entries()).map(([key, total]) => {
        const y = Math.floor(key / 100);
        const m = key % 100;
        return { year: y, month: m, total };
    });
    }

    /**
     * Calcula la suma total pendiente
     */
    export function totalPending(installments: Installment[]) {
    return installments
        .filter((i) => i.status !== "PAID")
        .reduce((acc, i) => acc + Number(i.amount), 0);
}
