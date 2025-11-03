// src/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;

        // Añadidos para paneles
        clientProfileId?: string | null;
        companyProfileId?: string | null;
        };
    }

    interface User {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;

        clientProfileId?: string | null;
        companyProfileId?: string | null;
    }

    interface JWT {
        id?: string;
        email?: string | null;
        clientProfileId?: string | null;
        companyProfileId?: string | null;
    }
}
