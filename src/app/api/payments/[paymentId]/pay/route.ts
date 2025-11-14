// src/app/api/payments/[paymentId]/pay/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: Request,
    context: { params: Promise<{ paymentId: string }> }
) {
    // params es Promise → await obligatorio (Next.js 15)
    const { paymentId } = await context.params;

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

    const body = await req.json();
    const paidNow = Number(body.amount);

    if (!paidNow || paidNow <= 0) {
        return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    // 1. Obtener cuota
    const payment = await prisma.payment.findFirst({
        where: {
            id: paymentId,
            loan: { ownerId: user.id },
        },
        include: {
            loan: true,
        },
    });

    if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // remaining = lo que queda por pagar
    const remaining = Number(payment.remaining ?? payment.amount);

    let leftover = paidNow - remaining; // si sobra → pasa al siguiente mes

    // 2. Actualizar cuota actual
    const newRemaining = Math.max(remaining - paidNow, 0);

    const updatedCurrent = await prisma.payment.update({
        where: { id: payment.id },
        data: {
            paidAmount: (payment.paidAmount ?? 0) + paidNow,
            remaining: newRemaining,
            status: newRemaining <= 0 ? "PAID" : "PENDING",
            paidAt: newRemaining <= 0 ? new Date() : payment.paidAt,
        },
    });

    // 3. Si no sobra dinero → fin
    if (leftover <= 0) {
        return NextResponse.json(updatedCurrent, { status: 200 });
    }

    // 4. Arrastrar sobrante a próximas cuotas
    const futurePayments = await prisma.payment.findMany({
        where: {
            loanId: payment.loanId,
            dueDate: { gt: payment.dueDate },
        },
        orderBy: { dueDate: "asc" },
    });

    let lastUpdated = updatedCurrent;

    for (const fp of futurePayments) {
        if (leftover <= 0) break;

        const fpRemaining = Number(fp.remaining ?? fp.amount);

        const fpNewRemaining = Math.max(fpRemaining - leftover, 0);
        const used = fpRemaining - fpNewRemaining;

        leftover = leftover - used;

        lastUpdated = await prisma.payment.update({
            where: { id: fp.id },
            data: {
                paidAmount: (fp.paidAmount ?? 0) + used,
                remaining: fpNewRemaining,
                status: fpNewRemaining <= 0 ? "PAID" : "PENDING",
                paidAt: fpNewRemaining <= 0 ? new Date() : fp.paidAt,
            },
        });
    }

    return NextResponse.json(lastUpdated, { status: 200 });
}
