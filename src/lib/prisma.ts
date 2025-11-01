// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ["error"], // en dev puedes añadir "query" si necesitas depurar
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
