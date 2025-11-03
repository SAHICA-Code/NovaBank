// src/app/api/import/xlsx/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";

// -------------------------- HELPERS --------------------------
function normalizeHeader(s: unknown): string {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function parseNumber(v: unknown): number {
    if (typeof v === "number") return v;
    if (v == null) return NaN;
    const s = String(v).replace(/\s/g, "").replace("€", "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
    }

    function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
    }
    function toISODate(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function parseDate(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const s = String(v).trim();

    const m1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
    if (m1) {
        const d = new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
        return isNaN(d.getTime()) ? null : d;
    }

    const m2 = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(s);
    if (m2) {
        const d = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
    }

    function normalizeStatus(v: unknown): "PENDING" | "PAID" {
    const s = String(v || "").toLowerCase();
    if (s.includes("paid") || s.includes("pagad")) return "PAID";
    return "PENDING";
    }

    // -------------------------- ROUTE --------------------------
    export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) {
        return NextResponse.json({ error: "Falta el archivo 'file' (.xlsx)" }, { status: 400 });
        }

        // Cargar Excel directamente desde ArrayBuffer (compatible con Vercel)
        const arrayBuffer = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(arrayBuffer as ArrayBuffer);

        const ws = wb.worksheets[0];
        if (!ws) {
        return NextResponse.json({ error: "No se encontró hoja en el Excel" }, { status: 400 });
        }

        // 1) localizar la fila de cabeceras de la tabla
        let headerRowIdx = -1;
        let headerMap: Record<string, number> = {};

        for (let r = 1; r <= Math.min(ws.rowCount, 50); r++) {
        const row = ws.getRow(r);

        // PROTECCIÓN: row.values puede ser undefined/null
        const rawValues = (row.values as unknown[] | undefined) ?? [];
        const labels = rawValues
            .map((x) => normalizeHeader((x as any)?.text ?? x))
            .filter(Boolean);

        if (labels.includes("cliente") && (labels.includes("inversion (€)") || labels.includes("inversion"))) {
            const map: Record<string, number> = {};

            // PROTECCIÓN en eachCell: value puede ser string | number | objeto
            row.eachCell((cell, col) => {
            const cellVal = (cell.value as any);
            const key = normalizeHeader(
                cellVal && typeof cellVal === "object" && "text" in cellVal ? cellVal.text : cellVal
            );
            if (key) map[key] = col;
            });

            const hasAll =
            (map["cliente"] ?? 0) &&
            (map["inversion (€)"] ?? map["inversion"] ?? 0) &&
            ((map["recargo (%)"] ?? 0) || (map["% recargo"] ?? 0)) &&
            (map["inicio"] ?? 0) &&
            (map["vencimiento"] ?? 0) &&
            (map["cuota (€)"] ?? 0) &&
            (map["estado"] ?? 0);

            if (hasAll) {
            headerRowIdx = r;
            headerMap = {
                cliente: map["cliente"],
                inversion: map["inversion (€)"] ?? map["inversion"],
                recargo: map["recargo (%)"] ?? map["% recargo"],
                inicio: map["inicio"],
                vencimiento: map["vencimiento"],
                cuota: map["cuota (€)"],
                estado: map["estado"],
            };
            break;
            }
        }
        }

        if (headerRowIdx < 0) {
        return NextResponse.json(
            { error: "No se localizaron las cabeceras de la tabla de cuotas. Usa el formato exportado." },
            { status: 400 }
        );
        }

        // 2) leer filas de detalle
        type DetailRow = {
        clientName: string;
        amount: number;
        markup: number;
        start: Date;
        due: Date;
        paymentAmount: number;
        status: "PENDING" | "PAID";
        };

        const details: DetailRow[] = [];
        for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        const cName = String(row.getCell(headerMap.cliente).value ?? "").trim();
        if (!cName) continue;

        const amount = parseNumber(row.getCell(headerMap.inversion).value);
        const markup = parseFloat(String(row.getCell(headerMap.recargo).value ?? "").replace(",", "."));
        const start = parseDate(row.getCell(headerMap.inicio).value);
        const due = parseDate(row.getCell(headerMap.vencimiento).value);
        const pay = parseNumber(row.getCell(headerMap.cuota).value);
        const status = normalizeStatus(row.getCell(headerMap.estado).value);

        if (!Number.isFinite(amount) || isNaN(markup) || !start || !due || !Number.isFinite(pay)) {
            continue;
        }

        details.push({
            clientName: cName,
            amount,
            markup: Math.round(markup),
            start,
            due,
            paymentAmount: pay,
            status,
        });
        }

        if (details.length === 0) {
        return NextResponse.json({ error: "No se encontraron filas válidas para importar." }, { status: 400 });
        }

        // 3) agrupar por (cliente, amount, markup, start)
        const groups = new Map<string, DetailRow[]>();
        for (const d of details) {
        const key = `${d.clientName}__${d.amount}__${d.markup}__${toISODate(d.start)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(d);
        }

        // 4) escribir en BD
        const report = {
        createdClients: 0,
        reusedClients: 0,
        upsertedLoans: 0,
        createdPayments: 0,
        replacedPayments: 0,
        groups: groups.size,
        };

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const [_key, rows] of groups) {
            const sample = rows[0]!;
            const clientName = sample.clientName.trim();
            const amount = sample.amount;
            const markup = sample.markup;
            const startISO = toISODate(sample.start);
            const months = rows.length;
            const totalToRepay = amount * (1 + markup / 100);

            let client = await tx.client.findFirst({
            where: { ownerId: user.id, name: clientName },
            select: { id: true },
            });
            if (!client) {
            client = await tx.client.create({
                data: { ownerId: user.id, name: clientName },
                select: { id: true },
            });
            report.createdClients += 1;
            } else {
            report.reusedClients += 1;
            }

            let loan = await tx.loan.findFirst({
            where: {
                ownerId: user.id,
                clientId: client.id,
                amount,
                markupPercent: markup,
                startDate: new Date(startISO),
            },
            select: { id: true },
            });

            if (loan) {
            const del = await tx.payment.deleteMany({ where: { loanId: loan.id } });
            report.replacedPayments += del.count;

            await tx.loan.update({
                where: { id: loan.id },
                data: {
                months,
                totalToRepay,
                updatedAt: new Date(),
                },
            });
            } else {
            loan = await tx.loan.create({
                data: {
                ownerId: user.id,
                clientId: client.id,
                amount,
                months,
                markupPercent: markup,
                totalToRepay,
                startDate: new Date(startISO),
                },
                select: { id: true },
            });
            report.upsertedLoans += 1;
            }

            if (rows.length > 0) {
            await tx.payment.createMany({
                data: rows.map((r) => ({
                loanId: loan!.id,
                dueDate: r.due,
                amount: r.paymentAmount,
                status: r.status,
                paidAt: r.status === "PAID" ? new Date() : null,
                })),
            });
            report.createdPayments += rows.length;
            }
        }
        });

        return NextResponse.json({ ok: true, report });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Error al importar", detail: String(e?.message ?? e) }, { status: 500 });
    }
}
