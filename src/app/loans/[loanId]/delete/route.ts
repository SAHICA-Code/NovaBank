import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    context: { params: Promise<{ loanId: string }> }
) {
    // params ES UNA PROMISE → hay que hacer await
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

    // Eliminar préstamo y pagos
    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { loanId } });

        await tx.loan.delete({
            where: {
                id: loanId,
                ownerId: user.id,
            },
        });
    });

    return NextResponse.redirect("/payments");
}
