// src/app/api/client/loans/[loanId]/installments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InstallmentStatus } from "@prisma/client";

type RouteParams = {
    params: { loanId: string };
    };

    export async function GET(_: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar que el préstamo pertenece al usuario
        const loan = await prisma.personalLoan.findFirst({
        where: {
            id: params.loanId,
            client: { userId: session.user.id },
        },
        select: { id: true },
        });

        if (!loan) {
        return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
        }

        const installments = await prisma.personalInstallment.findMany({
        where: { loanId: loan.id },
        orderBy: { dueDate: "asc" },
        select: {
            id: true,
            dueDate: true,
            amount: true,
            status: true,
            paidAt: true,
            principal: true,
            interest: true,
            extras: true,
        },
        });

        return NextResponse.json({ installments });
    } catch (e: any) {
        console.error("GET /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    export async function PATCH(req: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { installmentId, action, actualPaid } = await req.json().catch(() => ({} as any));
        if (!installmentId || !action) {
        return NextResponse.json({ error: "Faltan campos: installmentId, action" }, { status: 400 });
        }

        // Verificar pertenencia (el installment debe ser de un loan del usuario)
        const inst = await prisma.personalInstallment.findUnique({
        where: { id: installmentId },
        select: {
            id: true,
            amount: true,
            loan: { select: { id: true, client: { select: { userId: true } } } },
        },
        });

        if (!inst || inst.loan.client.userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        if (action === "markPaid") {
        await prisma.personalInstallment.update({
            where: { id: installmentId },
            data: {
            status: InstallmentStatus.PAID,
            paidAt: new Date(),
            actualPaid: null,
            },
        });
        return NextResponse.json({ ok: true });
        }

        if (action === "markPartial") {
        const paid = Number(actualPaid);
        if (!paid || paid <= 0) {
            return NextResponse.json({ error: "actualPaid debe ser > 0" }, { status: 400 });
        }
        await prisma.personalInstallment.update({
            where: { id: installmentId },
            data: {
            status: InstallmentStatus.PARTIAL,
            paidAt: new Date(),
            actualPaid: paid,
            },
        });
        return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    } catch (e: any) {
        console.error("PATCH /api/client/loans/[loanId]/installments error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
