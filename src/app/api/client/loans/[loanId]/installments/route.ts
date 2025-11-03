// src/app/api/client/loans/[loanId]/installments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { loanId: string };

// GET: lista las cuotas del préstamo del usuario
export async function GET(
    _req: NextRequest,
    context: { params: Promise<Params> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { loanId } = await context.params;

        // Validar que el préstamo pertenece al usuario
        const loan = await prisma.clientLoan.findFirst({
        where: {
            id: loanId,
            userId: session.user.id,
        },
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

    // PATCH: marca una cuota como pagada (tu enum solo tiene PENDING/PAID)
    export async function PATCH(
    req: NextRequest
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = (await req.json()) as {
        installmentId?: string;
        action?: "markPaid";
        };

        const installmentId = body?.installmentId ?? "";
        const action = body?.action ?? "";

        if (!installmentId || action !== "markPaid") {
        return NextResponse.json(
            { error: "Faltan campos o acción no soportada" },
            { status: 400 }
        );
        }

        // Verificar pertenencia: la cuota debe ser de un préstamo del usuario
        const inst = await prisma.clientInstallment.findUnique({
        where: { id: installmentId },
        select: {
            id: true,
            loan: { select: { userId: true } },
        },
        });

        if (!inst || inst.loan.userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        await prisma.clientInstallment.update({
        where: { id: installmentId },
        data: {
            status: "PAID",
            paidAt: new Date(),
        },
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("PATCH /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
