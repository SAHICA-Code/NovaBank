// src/app/api/client/loans/[loanId]/installments/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ❌ No importamos ningún enum de @prisma/client

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ loanId: string }> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { loanId } = await context.params;

        // Modelos del panel cliente según tu schema actual
        const loan = await prisma.clientLoan.findFirst({
        where: { id: loanId, userId: session.user.id },
        select: { id: true },
        });
        if (!loan) {
        return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
        }

        const installments = await prisma.clientInstallment.findMany({
        where: { loanId: loan.id },
        orderBy: { dueDate: "asc" },
        select: {
            id: true,
            dueDate: true,
            amount: true,
            status: true,
            paidAt: true,
            title: true,
        },
        });

        return NextResponse.json({ installments });
    } catch (e) {
        console.error("GET /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ loanId: string }> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { loanId } = await context.params;
        const body = await req.json().catch(() => ({}));
        const { installmentId, action } = body as { installmentId?: string; action?: string };

        if (!installmentId || !action) {
        return NextResponse.json({ error: "Faltan campos: installmentId, action" }, { status: 400 });
        }

        // Verificar pertenencia
        const inst = await prisma.clientInstallment.findUnique({
        where: { id: installmentId },
        select: { id: true, loan: { select: { id: true, userId: true } } },
        });
        if (!inst || inst.loan.userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        if (action === "markPaid") {
        await prisma.clientInstallment.update({
            where: { id: installmentId },
            data: { status: "PAID", paidAt: new Date() }, // ← literal string, tipado por Prisma
        });
        return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    } catch (e) {
        console.error("PATCH /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
