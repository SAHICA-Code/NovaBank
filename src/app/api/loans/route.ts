// src/app/api/loans/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFlatMarkupSchedule } from "@/lib/amortization";

// -------------------------------------------------------
// ⚡ UTIL GENERAL: obtener usuario autenticado
// -------------------------------------------------------
async function getAuthUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    return prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

// -------------------------------------------------------
// 🚀 CREAR PRÉSTAMO (POST)
// -------------------------------------------------------
export async function POST(req: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const {
        clientId,
        amount,
        markupPercent,
        months,
        startDate,
        endDate       // ⬅️ nuevo
    } = await req.json();

    if (!clientId) return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    if (!amount || Number(amount) <= 0)
        return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    if (!months || Number(months) < 1)
        return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    if (!startDate)
        return NextResponse.json({ error: "Fecha de inicio requerida" }, { status: 400 });

    const amt = Number(amount);
    const mths = Number(months);
    const mPercent = Number(markupPercent ?? 0);

    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : null;  // ⬅️ nuevo

    const schedule = buildFlatMarkupSchedule({
        amount: amt,
        months: mths,
        markupPercent: mPercent,
        startDate: sDate,
    });

    const created = await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.create({
            data: {
                ownerId: user.id,
                clientId,
                amount: String(amt.toFixed(2)),
                months: mths,
                markupPercent: mPercent,
                totalToRepay: String(schedule.total.toFixed(2)),
                startDate: sDate,
                //endDate: eDate,  
            },
        });

        await tx.payment.createMany({
            data: schedule.rows.map((r) => ({
                loanId: loan.id,
                dueDate: r.dueDate,
                amount: String(r.amount.toFixed(2)),
                status: "PENDING",
            })),
        });

        return loan;
    });

    return NextResponse.json(created, { status: 201 });
}

// -------------------------------------------------------
// ✏️ EDITAR PRÉSTAMO (PATCH)
// -------------------------------------------------------
export async function PATCH(req: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const {
        id,
        clientId,
        amount,
        markupPercent,
        months,
        startDate,
        endDate       // ⬅️ nuevo
    } = await req.json();

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    if (!amount || Number(amount) <= 0)
        return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    if (!months || Number(months) < 1)
        return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    if (!startDate)
        return NextResponse.json({ error: "Fecha de inicio requerida" }, { status: 400 });

    const amt = Number(amount);
    const mths = Number(months);
    const mPercent = Number(markupPercent ?? 0);

    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : null; // ⬅️ nuevo

    const existing = await prisma.loan.findFirst({
        where: { id, ownerId: user.id },
        select: { id: true },
    });

    if (!existing)
        return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });

    const schedule = buildFlatMarkupSchedule({
        amount: amt,
        months: mths,
        markupPercent: mPercent,
        startDate: sDate,
    });

    const updated = await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { loanId: id } });

        const loan = await tx.loan.update({
            where: { id },
            data: {
                clientId,
                amount: String(amt.toFixed(2)),
                months: mths,
                markupPercent: mPercent,
                startDate: sDate,
                endDate: eDate,             // ⬅️ nuevo
                totalToRepay: String(schedule.total.toFixed(2)),
            },
        });

        await tx.payment.createMany({
            data: schedule.rows.map((r) => ({
                loanId: loan.id,
                dueDate: r.dueDate,
                amount: String(r.amount.toFixed(2)),
                status: "PENDING",
            })),
        });

        return loan;
    });

    return NextResponse.json(updated, { status: 200 });
}
