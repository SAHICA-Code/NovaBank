import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: "Contraseña demasiado corta" }, { status: 400 });

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
        return NextResponse.json({ error: "Enlace inválido o caducado" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: record.identifier } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
    });

    // Limpia el token
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
}
