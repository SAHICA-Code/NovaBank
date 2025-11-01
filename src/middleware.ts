// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
    const { pathname, searchParams } = req.nextUrl;

    // Público / estáticos
    if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth") ||
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/auth")
    ) {
    return NextResponse.next();
    }


    // Rutas protegidas
    const needsAuth =
        pathname.startsWith("/cliente") ||
        pathname.startsWith("/dashboard");

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Sin sesión → login con callback
    if (needsAuth && !token) {
        const url = req.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(url);
    }

    // Si venimos de un login con callbackUrl, no interceptar
    if (token && searchParams.has("callbackUrl")) {
        return NextResponse.next();
    }

    // /cliente → requiere tener perfil; si no, onboarding
    if (pathname.startsWith("/cliente") && token) {
        const hasClient = Boolean((token as any).clientProfileId);
        if (!hasClient && !pathname.startsWith("/cliente/onboarding")) {
        const url = req.nextUrl.clone();
        url.pathname = "/cliente/onboarding";
        return NextResponse.redirect(url);
        }
    }

    // /dashboard: sólo requiere sesión (no redirigimos a ningún sitio)
    return NextResponse.next();
    }

    export const config = {
    matcher: ["/cliente/:path*", "/dashboard"],
};
