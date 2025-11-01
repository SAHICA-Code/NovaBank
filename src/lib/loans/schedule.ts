// src/lib/loans/schedule.ts
import { addMonths } from "date-fns";

/**
 * Estructura básica de una cuota
 */
export type InstallmentRow = {
    dueDate: Date;
    amount: number;
    principal?: number;
    interest?: number;
    extras?: number;
    };

    /**
     * Genera el calendario para préstamos de tipo "cuota fija manual"
     */
    export function buildManualSchedule(
    startDate: Date,
    months: number,
    monthlyPayment: number,
    monthlyExtras = 0
    ): InstallmentRow[] {
    const rows: InstallmentRow[] = [];
    for (let i = 0; i < months; i++) {
        rows.push({
        dueDate: addMonths(startDate, i),
        amount: Number((monthlyPayment + monthlyExtras).toFixed(2)),
        extras: monthlyExtras || undefined,
        });
    }
    return rows;
    }

    /**
     * Genera calendario para modo "con interés" (sistema francés)
     * (por ahora opcional, pero listo para extenderlo).
     */
    export function buildInterestSchedule(
    principal: number,
    annualRate: number,
    months: number,
    startDate: Date,
    monthlyExtras = 0
    ): InstallmentRow[] {
    const rows: InstallmentRow[] = [];

    const r = annualRate / 12 / 100; // tipo mensual
    const n = months;
    const cuota = (principal * r) / (1 - Math.pow(1 + r, -n));

    let saldo = principal;

    for (let i = 0; i < months; i++) {
        const interes = saldo * r;
        const principalPagado = cuota - interes;
        saldo -= principalPagado;

        rows.push({
        dueDate: addMonths(startDate, i),
        amount: Number((cuota + monthlyExtras).toFixed(2)),
        principal: Number(principalPagado.toFixed(2)),
        interest: Number(interes.toFixed(2)),
        extras: monthlyExtras || undefined,
        });
    }

    return rows;
}
