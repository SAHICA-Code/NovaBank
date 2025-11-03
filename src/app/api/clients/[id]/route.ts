// src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

// (Opcional) GET: devolver un cliente concreto del owner autenticado
export async function GET(
    _req: NextRequest,
    context: { params: Promise<Params> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const { id } = await context.params;

        const client = await prisma.client.findFirst({
        where: { id, ownerId: session.user.id },
        });
        if (!client) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }
        return NextResponse.json(client);
    } catch (e) {
        console.error("GET /api/clients/[id] error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    // PATCH: actualizar nombre/descripcion/telefono del cliente (propiedad del owner autenticado)
    export async function PATCH(
    req: NextRequest,
    context: { params: Promise<Params> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const { id } = await context.params;

        const body = (await req.json()) as {
        name?: string | null;
        description?: string | null;
        phone?: string | null;
        };

        // comprobar pertenencia
        const exists = await prisma.client.findFirst({
        where: { id, ownerId: session.user.id },
        select: { id: true },
        });
        if (!exists) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        const updated = await prisma.client.update({
        where: { id },
        data: {
            name: typeof body.name === "string" ? body.name : undefined,
            description:
            typeof body.description === "string" ? body.description : undefined,
            phone: typeof body.phone === "string" ? body.phone : undefined,
        },
        select: {
            id: true,
            name: true,
            description: true,
            phone: true,
            createdAt: true,
        },
        });

        return NextResponse.json(updated);
    } catch (e) {
        console.error("PATCH /api/clients/[id] error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    }

    // (Opcional) DELETE: eliminar cliente del owner autenticado
    export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<Params> }
    ) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const { id } = await context.params;

        const exists = await prisma.client.findFirst({
        where: { id, ownerId: session.user.id },
        select: { id: true },
        });
        if (!exists) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        await prisma.client.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("DELETE /api/clients/[id] error:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
