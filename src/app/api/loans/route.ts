// src/app/api/loans/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFlatMarkupSchedule } from "@/lib/amortization";

// ---------- CREAR PRÉSTAMO (POST) ----------
export async function POST(req: Request) {
  // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "No user" }, { status: 401 });
    }

    // 2) Body (nuevo contrato)
    const { clientId, amount, markupPercent, months, startDate } =
        await req.json();

    if (!clientId) {
        return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    }
    if (amount === undefined || Number(amount) <= 0) {
        return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    }
    if (months === undefined || Number(months) < 1) {
        return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    }
    if (!startDate) {
        return NextResponse.json(
        { error: "Fecha de inicio requerida" },
        { status: 400 }
        );
    }

    const amt = Number(amount);
    const mths = Number(months);
    const mPercent = Number(markupPercent ?? 0);
    const sDate = new Date(startDate);

    // 3) Generar calendario con RECARGO SIMPLE
    const schedule = buildFlatMarkupSchedule({
        amount: amt,
        months: mths,
        markupPercent: mPercent,
        startDate: sDate,
    });

    // 4) Transacción: crear Loan + Payments
    const created = await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.create({
        data: {
            ownerId: user.id,
            clientId,
            amount: String(amt.toFixed(2)), // Decimal -> string
            months: mths,
            markupPercent: mPercent,
            totalToRepay: String(schedule.total.toFixed(2)),
            startDate: sDate,
        },
        });

        await tx.payment.createMany({
        data: schedule.rows.map((r) => ({
            loanId: loan.id,
            dueDate: r.dueDate,
            amount: String(r.amount.toFixed(2)), // sin principal/interest
            status: "PENDING",
        })),
        });

        return loan;
    });

    return NextResponse.json(created, { status: 201 });
    }

    // ---------- EDITAR PRÉSTAMO (PATCH) ----------
    export async function PATCH(req: Request) {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "No user" }, { status: 401 });
    }

    // 2) Body (préstamo a actualizar)
    const { id, clientId, amount, markupPercent, months, startDate } =
        await req.json();

    if (!id) {
        return NextResponse.json(
        { error: "ID del préstamo requerido" },
        { status: 400 }
        );
    }
    if (!clientId) {
        return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
    }
    if (amount === undefined || Number(amount) <= 0) {
        return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    }
    if (months === undefined || Number(months) < 1) {
        return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    }
    if (!startDate) {
        return NextResponse.json(
        { error: "Fecha de inicio requerida" },
        { status: 400 }
        );
    }

    const amt = Number(amount);
    const mths = Number(months);
    const mPercent = Number(markupPercent ?? 0);
    const sDate = new Date(startDate);

    // 3) Comprobar que el préstamo existe y es del usuario
    const existing = await prisma.loan.findFirst({
        where: {
        id,
        ownerId: user.id,
        },
        select: { id: true },
    });

    if (!existing) {
        return NextResponse.json(
        { error: "Préstamo no encontrado" },
        { status: 404 }
        );
    }

    // 4) Generar nuevo calendario
    const schedule = buildFlatMarkupSchedule({
        amount: amt,
        months: mths,
        markupPercent: mPercent,
        startDate: sDate,
    });

    // 5) Transacción: actualizar Loan + borrar cuotas antiguas + crear nuevas
    const updated = await prisma.$transaction(async (tx) => {
        // Opción sencilla: se regeneran todas las cuotas desde cero
        await tx.payment.deleteMany({
        where: { loanId: id },
        });

        const loan = await tx.loan.update({
        where: { id },
        data: {
            clientId,
            amount: String(amt.toFixed(2)),
            months: mths,
            markupPercent: mPercent,
            totalToRepay: String(schedule.total.toFixed(2)),
            startDate: sDate,
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
