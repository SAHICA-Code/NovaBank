// src/app/api/auth/register/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";

export async function POST(req: Request) {
    const { name, email, password } = await req.json();
    if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });

    const passwordHash = await hash(password, 10);
    await prisma.user.create({ data: { name, email, passwordHash } });

    return NextResponse.json({ ok: true });
}
