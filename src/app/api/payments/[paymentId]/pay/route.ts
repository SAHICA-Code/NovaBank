// src/app/api/payments/[paymentId]/pay/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: Request,
    context: { params: Promise<{ paymentId: string }> }
) {
    // params es Promise → await obligatorio en Next.js 15
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
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const paidNow = Number(body.amount);

    if (!paidNow || paidNow <= 0) {
        return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    // Obtener cuota actual
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

    // === MODO TEMPORAL SIN MIGRATION ===
    // Como aún no existen 'remaining' ni 'paidAmount',
    // pagamos la cuota completa tal como funcionaba antes.

    const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: "PAID",
            paidAt: new Date(),
        },
    });

    return NextResponse.json(updated, { status: 200 });
}
