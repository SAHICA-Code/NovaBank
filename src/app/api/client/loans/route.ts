// src/app/api/client/loans/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMonths } from "date-fns";
import { AmortizationMode, LoanType, InstallmentStatus } from "@prisma/client";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
        });
        if (!profile) {
        return NextResponse.json({ loans: [] }, { status: 200 });
        }

        const loans = await prisma.personalLoan.findMany({
        where: { clientId: profile.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            type: true,
            mode: true,
            months: true,
            startDate: true,
            monthlyPayment: true,
            monthlyExtras: true,
            createdAt: true,
            _count: { select: { installments: true } },
        },
        });

        return NextResponse.json({ loans });
    } catch (e: any) {
        console.error("GET /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
        });
        if (!profile) {
        return NextResponse.json({ error: "No existe perfil de cliente" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const {
        title,
        type = "OTHER",
        startDate,
        months,
        monthlyPayment,
        monthlyExtras = 0,
        }: {
        title?: string;
        type?: LoanType;
        startDate?: string;
        months?: number;
        monthlyPayment?: number;
        monthlyExtras?: number;
        } = body;

        if (!title || !months || !monthlyPayment) {
        return NextResponse.json(
            { error: "Faltan campos obligatorios: title, months, monthlyPayment" },
            { status: 400 }
        );
        }

        const start = startDate ? new Date(startDate) : new Date();

        const created = await prisma.$transaction(async (tx) => {
        const loan = await tx.personalLoan.create({
            data: {
            clientId: profile.id,
            title,
            type,
            mode: AmortizationMode.FIXED_PAYMENT_MANUAL,
            months,
            startDate: start,
            monthlyPayment,
            monthlyExtras: monthlyExtras || null,
            },
            select: { id: true },
        });

        const rows = Array.from({ length: months }).map((_, i) => {
            const dueDate = addMonths(start, i);
            const amount = (monthlyPayment || 0) + (monthlyExtras || 0);
            return {
            loanId: loan.id,
            dueDate,
            amount,
            principal: null,
            interest: null,
            extras: monthlyExtras || null,
            status: InstallmentStatus.PENDING,
            };
        });

        await tx.personalInstallment.createMany({ data: rows });

        return loan;
        });

        return NextResponse.json({ ok: true, loanId: created.id }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/client/loans error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
