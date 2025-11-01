import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Si el usuario ya tiene contraseña guardada, verificarla
    if (user.passwordHash) {
        if (!currentPassword) {
        return NextResponse.json(
            { error: "Debes indicar tu contraseña actual." },
            { status: 400 }
        );
        }
        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
        return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
        }
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash }, // ✅ actualiza passwordHash
    });

    return NextResponse.json({ ok: true });
}
