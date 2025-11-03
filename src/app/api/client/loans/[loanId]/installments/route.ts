// src/app/api/client/loans/[loanId]/installments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientInstallmentStatus } from "@prisma/client";

type RouteContext = {
    params: Promise<{ loanId: string }>;
    };

    type PatchBody = {
    installmentId: string;
    action: "markPaid"; // Solo soportado por tu esquema actual
    };

    export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { loanId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar que el préstamo (ClientLoan) pertenece al usuario
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
            status: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
        },
        });

        return NextResponse.json({ installments });
    } catch (e) {
        console.error("GET /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        await context.params; // por consistencia, aunque no lo uses aquí

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = (await req.json().catch(() => null)) as PatchBody | null;
        if (!body) {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
        }

        const { installmentId, action } = body;
        if (!installmentId || !action) {
        return NextResponse.json(
            { error: "Faltan campos: installmentId, action" },
            { status: 400 }
        );
        }

        // Verificar pertenencia: el installment debe ser de un loan del usuario
        const inst = await prisma.clientInstallment.findUnique({
        where: { id: installmentId },
        select: {
            id: true,
            loan: { select: { id: true, userId: true } },
        },
        });

        if (!inst || inst.loan.userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        if (action === "markPaid") {
        await prisma.clientInstallment.update({
            where: { id: installmentId },
            data: {
            status: ClientInstallmentStatus.PAID,
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
