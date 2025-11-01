// src/lib/amortization.ts
import { addMonths } from "date-fns";

export type PaymentRow = {
    dueDate: Date;
    amount: number;     // cuota total
    interest: number;   // parte intereses (0 en recargo simple)
    principal: number;  // parte capital (== amount en recargo simple)
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Amortización con RECARGO SIMPLE (no TAE):
 * total = amount * (1 + markupPercent/100)
 * - Reparte el total en 'months' cuotas iguales (ajustando la última por redondeo).
 * - Por simplicidad: interest = 0, principal = amountDeLaCuota.
 * - La primera cuota vence 1 mes después de startDate (comportamiento típico mensual).
 */
export function buildFlatMarkupSchedule(opts: {
    amount: number;        // capital prestado
    months: number;        // nº de cuotas
    markupPercent: number; // % de recargo simple sobre el total
    startDate: Date;       // fecha de inicio del préstamo
}): { total: number; monthly: number; rows: PaymentRow[] } {
    const { amount, months, markupPercent, startDate } = opts;

    const total = round2(amount * (1 + markupPercent / 100));
    // base truncada a 2 decimales para evitar "pasarnos"; se ajusta la última
    const base = Math.floor((total / months) * 100) / 100;

    const rows: PaymentRow[] = [];
    let acumulado = 0;

    for (let i = 1; i <= months; i++) {
        // Primera cuota un mes después de startDate
        const dueDate = addMonths(startDate, i);
        const cuota = i < months ? base : round2(total - acumulado);
        acumulado = round2(acumulado + cuota);

        rows.push({
        dueDate,
        amount: cuota,
        interest: 0,
        principal: cuota,
        });
    }

    const monthly = rows[0]?.amount ?? round2(total / months);
    return { total, monthly, rows };
}

/* ---------------------------------------------------------------------------
 * (Opcional) Compatibilidad: si en algún sitio antiguo llamabas a buildSchedule
 * con TAE, aquí dejamos un "shim" para no romper importaciones.
 * Esto NO calcula TAE; simplemente reparte sin intereses (markup 0).
 * Puedes eliminarlo si no lo necesitas.
 * --------------------------------------------------------------------------*/
export function buildSchedule(opts: {
    principal: number;
    annualRatePct: number; // ignorado en este modo simple
    months: number;
    startDate: Date;
    }): { monthly: number; rows: PaymentRow[] } {
    const { principal, months, startDate } = opts;
    const { monthly, rows } = buildFlatMarkupSchedule({
        amount: principal,
        months,
        markupPercent: 0,
        startDate,
    });
    return { monthly, rows };
}
