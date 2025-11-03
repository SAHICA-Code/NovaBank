// src/app/api/client/loans/[loanId]/installments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { loanId: string };

// GET: cuotas de un préstamo del panel cliente
export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { loanId } = await ctx.params;

        // Validar que el préstamo pertenece al usuario
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
            title: true,
            dueDate: true,
            amount: true,
            status: true, // "PENDING" | "PAID"
            paidAt: true,
        },
        });

        return NextResponse.json({ installments });
    } catch (e) {
        console.error("GET /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    // PATCH: marcar pagada una cuota (o parcial -> aquí solo PENDING/PAID según tu schema)
    export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { loanId } = await ctx.params;

        type Body = { installmentId?: string; action?: "markPaid" };
        const body: Body = await req.json().catch(() => ({} as Body));

        if (!body.installmentId || !body.action) {
        return NextResponse.json({ error: "Faltan campos: installmentId, action" }, { status: 400 });
        }

        // Verificar pertenencia del installment
        const inst = await prisma.clientInstallment.findUnique({
        where: { id: body.installmentId },
        select: {
            id: true,
            loanId: true,
            loan: { select: { userId: true } },
        },
        });

        if (!inst || inst.loan.userId !== session.user.id || inst.loanId !== loanId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        if (body.action === "markPaid") {
        await prisma.clientInstallment.update({
            where: { id: body.installmentId },
            data: {
            status: "PAID",
            paidAt: new Date(),
            },
        });
        return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    } catch (e) {
        console.error("PATCH /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
