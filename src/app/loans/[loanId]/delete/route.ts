import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    context: { params: Promise<{ loanId: string }> }
) {
    const { loanId } = await context.params;

    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) redirect("/auth/login");

    // Verificar que el préstamo pertenece al usuario
    const loan = await prisma.loan.findFirst({
        where: {
            id: loanId,
            ownerId: user.id,
        },
    });

    if (!loan) {
        redirect("/payments");
    }

    // Borrar pagos + préstamo
    await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { loanId } });
        await tx.loan.delete({ where: { id: loanId } });
    });

    // 🔥 Redirección limpia y sin error:
    redirect("/payments");
}
