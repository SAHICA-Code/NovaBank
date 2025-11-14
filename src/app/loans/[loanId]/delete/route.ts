import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    context: { params: Promise<{ loanId: string }> }
) {
    // params es Promise → se hace await
    const { loanId } = await context.params;

    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Verificar que el préstamo pertenece al usuario
    const loan = await prisma.loan.findFirst({
        where: {
            id: loanId,
            ownerId: user.id,
        },
    });

    if (!loan) {
        return NextResponse.json(
            { error: "Loan not found or unauthorized" },
            { status: 404 }
        );
    }

    // Borrar pagos y préstamo
    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { loanId } });
        await tx.loan.delete({ where: { id: loanId } });
    });

    // Redirigir a /payments correctamente
    return NextResponse.redirect("/payments");
}
