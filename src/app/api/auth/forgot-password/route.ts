import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: Request) {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    // Respondemos igual aunque no exista, por seguridad
    if (!user) return NextResponse.json({ ok: true });

    // Crear token
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    // Guardar en VerificationToken (identifier = email)
    await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
    });

    // Envío del enlace:
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password?token=${encodeURIComponent(token)}`;

    // ⚠️ En producción usa un SMTP (nodemailer). En dev devolvemos el link:
    console.log("[Password reset link]", resetUrl);

      await sendPasswordResetEmail(email, resetUrl);
      
  return NextResponse.json({ ok: true, resetUrl }); // en prod no devuelvas el link


}
