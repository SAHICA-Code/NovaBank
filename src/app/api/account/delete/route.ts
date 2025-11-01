import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Al eliminar el usuario, por onDelete: Cascade se borran:
    // - Accounts, Sessions
    // - Clients (ownerId) y Loans (ownerId)
    // - Payments (por Loan -> onDelete: Cascade)
    await prisma.user.delete({ where: { id: user.id } });

    return NextResponse.json({ ok: true });
}
