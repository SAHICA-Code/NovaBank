// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/auth/login",
        signOut: "/auth/signout",
        error: "/auth/login",
    },
    providers: [
        Google({
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        Credentials({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(creds) {
            if (!creds?.email || !creds?.password) return null;

            const user = await prisma.user.findUnique({
            where: { email: creds.email },
            include: { clientProfile: true }, // ← Solo clientProfile
            });

            if (!user?.passwordHash) return null;
            const ok = await compare(creds.password, user.passwordHash);
            return ok ? user : null;
        },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
        if (user) {
            token.id = (user as any).id;
            token.email = (user as any).email ?? null;
            token.clientProfileId = (user as any).clientProfile?.id ?? null;
        } else if (token?.id) {
            const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { clientProfile: true },
            });
            if (dbUser) {
            token.clientProfileId = dbUser.clientProfile?.id ?? null;
            }
        }
        return token;
        },

        async session({ session, token }) {
        if (session.user) {
            (session.user as any).id = token.id ?? "";
            (session.user as any).email = token.email ?? null;
            (session.user as any).clientProfileId = token.clientProfileId ?? null;
        }
        return session;
        },

        // 👇 Redirección personalizada: respeta /cliente, /dashboard, etc.
        async redirect({ url, baseUrl }) {
        try {
            // Si es una ruta interna (p. ej. /cliente), construir URL completa
            if (url.startsWith("/")) return `${baseUrl}${url}`;

            // Si es del mismo dominio, permitirla
            const u = new URL(url);
            if (u.origin === baseUrl) return url;

            // Si no, redirigir al home seguro
            return baseUrl;
        } catch {
            return baseUrl;
        }
        },
    },
};
