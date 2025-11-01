import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    if (!resend) {
        console.log("[DEV] Enlace de restablecimiento:", resetUrl);
        return;
    }

    console.log("🚀 Enviando email con Resend a:", to);
    console.log("🔑 Usando clave:", process.env.RESEND_API_KEY?.slice(0, 8) + "...");

    try {
        const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Nova Bank <no-reply@resend.dev>",
        to,
        subject: "Restablecer contraseña — Nova Bank",
        html: `
            <div style="font-family:system-ui,Arial,sans-serif;line-height:1.5;color:#111;">
            <h2 style="color:#4338ca;">Nova Bank</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el botón:</p>
            <p>
                <a href="${resetUrl}"
                style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:12px">
                Restablecer contraseña
                </a>
            </p>
            <p>O copia este enlace:</p>
            <p style="word-break:break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
            <p style="color:#555;font-size:12px;">Este enlace caduca en 30 minutos.</p>
            </div>
        `,
        });

        console.log("✅ Resultado de Resend:", result);
    } catch (err) {
        console.error("❌ Error al enviar con Resend:", err);
    }
}
