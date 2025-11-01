// src/lib/validators/loan.ts
import { z, type ZodIssue } from "zod";

export const loanManualSchema = z.object({
    title: z.string()
        .min(2, "El título debe tener al menos 2 caracteres.")
        .max(100, "El título es demasiado largo."),
    type: z.enum(["MORTGAGE", "CAR", "PERSONAL", "STUDENT", "OTHER"]).default("OTHER"),
    startDate: z.coerce.date(),
    months: z.coerce.number()
        .int()
        .min(1, "Debe durar al menos 1 mes.")
        .max(600, "Demasiados meses (máx. 50 años)."),
    monthlyPayment: z.coerce.number()
        .positive("Debe ser mayor que 0."),
    monthlyExtras: z.coerce.number()
        .nonnegative("No puede ser negativo.")
        .optional()
        .default(0),
    });

    export type LoanManualInput = z.infer<typeof loanManualSchema>;

    export function parseLoanManual(data: unknown): LoanManualInput {
    const parsed = loanManualSchema.safeParse(data);
    if (!parsed.success) {
        const message = parsed.error.issues.map((e: ZodIssue) => e.message).join("; ");
        throw new Error(message);
    }
    return parsed.data;
}
