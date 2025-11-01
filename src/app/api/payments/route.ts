import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/payments?clientId=...
export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId") || "";

    const where = {
        loan: {
        ownerId: user.id,
        ...(clientId ? { clientId } : {}),
        },
    } as const;

    const raw = await prisma.payment.findMany({
        where,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: { loan: { select: { client: { select: { name: true } } } } },
    });

    // Serializar: Date -> string, Decimal -> number
    const payments = raw.map((p) => ({
        id: p.id,
        dueDate: p.dueDate.toISOString(),
        amount: Number(p.amount),
        status: p.status as "PENDING" | "PAID" | "LATE",
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        loan: { client: { name: p.loan.client.name } },
    }));

    const pendingTotal = payments
        .filter((p) => p.status === "PENDING")
        .reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({ payments, pendingTotal });
    }

    // PATCH /api/payments  { id: string }
    export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await prisma.payment.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date() },
    });

    // Serializar campos de vuelta
    return NextResponse.json({
        id: updated.id,
        dueDate: updated.dueDate.toISOString(),
        amount: Number(updated.amount),
        status: updated.status as "PENDING" | "PAID" | "LATE",
        paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
    });
}
