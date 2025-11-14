// src/app/loans/[loanId]/delete/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: { loanId: string };
    };

    export async function POST(req: Request, { params }: RouteContext) {
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

    const loan = await prisma.loan.findFirst({
        where: {
        id: params.loanId,
        ownerId: user.id,
        },
        select: { id: true, clientId: true },
    });

    if (!loan) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { loanId: loan.id } });
        await tx.loan.delete({ where: { id: loan.id } });
    });

    const redirectUrl = new URL(req.url);
    redirectUrl.pathname = "/payments";
    redirectUrl.search = loan.clientId
        ? `clientId=${loan.clientId}`
        : "";

    return NextResponse.redirect(redirectUrl.toString());
    }

    export async function GET() {
    return NextResponse.json(
        { error: "Método no permitido" },
        { status: 405 }
    );
}
