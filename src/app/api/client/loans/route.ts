// src/app/api/client/loans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";

/**
 * GET: lista los préstamos del panel cliente del usuario autenticado
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const loans = await prisma.clientLoan.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            months: true,
            monthlyPayment: true,
            monthlyExtras: true,
            finishedAt: true,
        },
        });

        return NextResponse.json({ loans });
    } catch (e) {
        console.error("GET /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    /**
     * POST: crea un préstamo manual y genera sus cuotas (panel cliente)
     * body: { title, type, startDate, months, monthlyPayment, monthlyExtras }
     */
    export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        type Body = {
        title?: string;
        type?: string; // validaremos contra la lista
        startDate?: string;
        months?: number;
        monthlyPayment?: number;
        monthlyExtras?: number | null;
        };

        const body = (await req.json()) as Body;

        const title = String(body.title ?? "").trim();
        const typeRaw = String(body.type ?? "OTHER").toUpperCase();

        // NO importamos enums de Prisma: validamos con literales
        const ALLOWED_TYPES = ["MORTGAGE", "CAR", "PERSONAL", "STUDENT", "OTHER"] as const;
        const type = (ALLOWED_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : "OTHER";

        const months = Number(body.months ?? 0);
        const monthlyPayment = Number(body.monthlyPayment ?? 0);
        const monthlyExtras = body.monthlyExtras != null ? Number(body.monthlyExtras) : null;

        const startDate =
        body.startDate ? new Date(body.startDate) : new Date(new Date().toISOString().slice(0, 10));

        if (!title || !Number.isFinite(months) || months < 1 || !Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
        return NextResponse.json(
            { error: "Campos inválidos: título, meses (>0) y cuota mensual (>0) son obligatorios." },
            { status: 400 }
        );
        }

        // Perfil de cliente del usuario
        const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
        });
        if (!profile) {
        return NextResponse.json({ error: "No existe ClientProfile para este usuario." }, { status: 400 });
        }

        // Transacción: crear loan + installments
        const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.clientLoan.create({
            data: {
            userId: session.user.id,
            profileId: profile.id,
            title,
            type: type as any, // almacenamos el literal
            startDate,
            months,
            monthlyPayment,
            monthlyExtras: monthlyExtras ?? null,
            },
            select: { id: true },
        });

        // Generar cuotas
        const rows: {
            loanId: string;
            userId: string;
            profileId: string;
            title: string | null;
            dueDate: Date;
            amount: number;
            status: "PENDING" | "PAID";
            paidAt: Date | null;
        }[] = [];

        for (let i = 0; i < months; i++) {
            const dueDate = addMonths(startDate, i);
            const amount = monthlyPayment + (monthlyExtras ?? 0);

            rows.push({
            loanId: loan.id,
            userId: session.user.id,
            profileId: profile.id,
            title: null,
            dueDate,
            amount,
            status: "PENDING", // en tu schema de cliente solo tienes PENDING | PAID
            paidAt: null,
            });
        }

        await tx.clientInstallment.createMany({ data: rows });

        return loan.id;
        });

        return NextResponse.json({ ok: true, loanId: result }, { status: 201 });
    } catch (e) {
        console.error("POST /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
