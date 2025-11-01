import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user)
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // 1️⃣ Datos
    const [loans, payments] = await Promise.all([
        prisma.loan.findMany({
        where: { ownerId: user.id },
        select: {
            id: true,
            amount: true,
            markupPercent: true,
            totalToRepay: true,
            startDate: true,
            client: { select: { name: true } },
        },
        }),
        prisma.payment.findMany({
        where: { loan: { ownerId: user.id } },
        select: { loanId: true, amount: true, dueDate: true, status: true },
        }),
    ]);

    // 2️⃣ Cálculos resumen
    const invested = loans.reduce((sum, l) => sum + Number(l.amount), 0);
    const totalToCollect = loans.reduce((sum, l) => sum + Number(l.totalToRepay), 0);
    const profit = totalToCollect - invested;

    const paidTotal = payments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const capitalRecovered = Math.min(paidTotal, invested);
    const capitalPending = Math.max(invested - capitalRecovered, 0);
    const profitCollected = Math.max(paidTotal - invested, 0);

    // 3️⃣ Crear Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Resumen y Cuotas");
    sheet.properties.defaultRowHeight = 20;

    // 4️⃣ Resumen financiero (sin columnas)
    const resumen = [
        ["Resumen financiero"],
        ["Inversión total (€)", invested],
        ["Beneficio previsto (€)", profit],
        ["Total final (€)", totalToCollect],
        ["Cobrado hasta hoy (€)", paidTotal],
        ["Capital recuperado (€)", capitalRecovered],
        ["Capital por recuperar (€)", capitalPending],
        ["Beneficio cobrado (€)", profitCollected],
        [],
    ];
    resumen.forEach((r) => sheet.addRow(r));

    // Estilo título principal
    sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "4F46E5" } };
    sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

    // 5️⃣ Definimos columnas solo para la tabla inferior
    const startRow = sheet.lastRow!.number + 1;

    sheet.getRow(startRow).values = [
        "Cliente",
        "Inversión (€)",
        "Recargo (%)",
        "Inicio",
        "Vencimiento",
        "Cuota (€)",
        "Estado",
    ];
    sheet.getRow(startRow).font = { bold: true, color: { argb: "1E293B" } };
    sheet.getRow(startRow).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E0E7FF" },
    };

    // 6️⃣ Añadimos filas con los préstamos/cuotas
    for (const loan of loans) {
        const relatedPayments = payments.filter((p) => p.loanId === loan.id);
        for (const p of relatedPayments) {
        sheet.addRow([
            loan.client.name,
            Number(loan.amount),
            loan.markupPercent,
            new Date(loan.startDate).toISOString().slice(0, 10),
            new Date(p.dueDate).toISOString().slice(0, 10),
            Number(p.amount),
            p.status,
        ]);
        }
    }

    // 👇 NUEVO: Auto-ajuste de ancho para la tabla inferior (seguro para TS)
    {
        const headerRow = sheet.getRow(startRow);
        const totalCols = headerRow.cellCount; // 7 columnas de la tabla

        for (let i = 1; i <= totalCols; i++) {
        const col = sheet.getColumn(i);
        let maxLen = 0;

        col.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            // Solo ajustamos desde la cabecera de la tabla hacia abajo
            if (rowNumber < startRow) return;

            const v = cell.value as unknown;
            const text =
            v == null
                ? ""
                : typeof v === "object" && v !== null && "text" in (v as any)
                ? String((v as any).text)
                : String(v);

            if (text.length > maxLen) maxLen = text.length;
        });

        col.width = Math.max(10, maxLen + 2); // mínimo agradable + margen
        }
    }

    // 7️⃣ Enviamos Excel
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
        headers: {
        "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="novabank_resumen.xlsx"`,
        },
    });
}
