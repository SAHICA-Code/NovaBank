// src/app/api/client/loans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";
import { ClientLoanType, ClientInstallmentStatus } from "@prisma/client";

/** LISTAR PRÉSTAMOS DEL CLIENTE ACTUAL */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Buscar el perfil del cliente del usuario
        const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
        });

        if (!profile) {
        // Si no hay perfil aún, devolver lista vacía
        return NextResponse.json({ loans: [] });
        }

        const loans = await prisma.clientLoan.findMany({
        where: { userId: session.user.id, profileId: profile.id },
        orderBy: { startDate: "desc" },
        select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            months: true,
            monthlyPayment: true,
            monthlyExtras: true,
            finishedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        });

        return NextResponse.json({ loans });
    } catch (e) {
        console.error("GET /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    type PostBody = {
    title: string;
    type?: ClientLoanType; // por defecto OTHER si no viene
    startDate: string; // ISO
    months: number;
    monthlyPayment: number;
    monthlyExtras?: number | null;
    };

    /** CREAR PRÉSTAMO + GENERAR CUOTAS */
    export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = (await req.json().catch(() => null)) as PostBody | null;
        if (!body) {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
        }

        const { title, type, startDate, months, monthlyPayment, monthlyExtras } = body;

        if (!title || !startDate || !months || !monthlyPayment) {
        return NextResponse.json(
            { error: "Faltan campos obligatorios: title, startDate, months, monthlyPayment" },
            { status: 400 }
        );
        }

        const sd = new Date(startDate);
        if (Number.isNaN(sd.getTime())) {
        return NextResponse.json({ error: "startDate inválida" }, { status: 400 });
        }
        if (!Number.isFinite(months) || months <= 0) {
        return NextResponse.json({ error: "months debe ser > 0" }, { status: 400 });
        }
        if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
        return NextResponse.json({ error: "monthlyPayment debe ser > 0" }, { status: 400 });
        }
        const extras = monthlyExtras ?? null;
        if (extras !== null && (!Number.isFinite(extras) || extras < 0)) {
        return NextResponse.json({ error: "monthlyExtras debe ser >= 0" }, { status: 400 });
        }

        // Asegurar perfil del cliente
        let profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
        });

        if (!profile) {
        profile = await prisma.clientProfile.create({
            data: {
            userId: session.user.id,
            },
            select: { id: true },
        });
        }

        // Crear el préstamo
        const loan = await prisma.clientLoan.create({
        data: {
            userId: session.user.id,
            profileId: profile.id,
            title: title.trim(),
            type: type ?? ClientLoanType.OTHER,
            startDate: sd,
            months,
            monthlyPayment,
            monthlyExtras: extras,
        },
        select: { id: true, profileId: true, userId: true, startDate: true },
        });

        // Generar cuotas (amount = monthlyPayment + monthlyExtras)
        const installmentsData = Array.from({ length: months }).map((_, i) => {
        const due = addMonths(loan.startDate, i);
        const base = Number(monthlyPayment);
        const extra = extras ? Number(extras) : 0;
        const total = base + extra;

        return {
            loanId: loan.id,
            userId: loan.userId,
            profileId: loan.profileId,
            title: `Cuota ${i + 1}`,
            dueDate: due,
            amount: total,
            status: ClientInstallmentStatus.PENDING,
        };
        });

        if (installmentsData.length > 0) {
        await prisma.clientInstallment.createMany({
            data: installmentsData,
        });
        }

        return NextResponse.json({ ok: true, loanId: loan.id });
    } catch (e) {
        console.error("POST /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
