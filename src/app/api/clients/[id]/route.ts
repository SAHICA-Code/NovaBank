// src/app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
    };

    type PatchBody = {
    name?: string;
    description?: string | null;
    phone?: string | null;
    };

    // DELETE /api/clients/:id
    export async function DELETE(_req: NextRequest, context: RouteContext) {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "No user" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
        where: { id },
        select: { ownerId: true },
    });

    if (!client || client.ownerId !== user.id) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
    }

    // PATCH /api/clients/:id
    export async function PATCH(req: NextRequest, context: RouteContext) {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "No user" }, { status: 401 });
    }

    const existing = await prisma.client.findUnique({
        where: { id },
        select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== user.id) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { name, description, phone } = body;

    const data: Partial<{ name: string; description: string | null; phone: string | null }> = {};

    if (typeof name === "string") data.name = name.trim();
    if (typeof description === "string" || description === null) {
        data.description = description ? String(description).trim() : null;
    }
    if (typeof phone === "string" || phone === null) {
        data.phone = phone ? String(phone).trim() : null;
    }

    if (
        data.name === undefined &&
        !("description" in data) &&
        !("phone" in data)
    ) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    if (data.name !== undefined && data.name.length === 0) {
        return NextResponse.json(
        { error: "El nombre no puede estar vacío" },
        { status: 400 }
        );
    }

    const updated = await prisma.client.update({
        where: { id },
        data,
        select: { id: true, name: true, description: true, phone: true, createdAt: true },
    });

    return NextResponse.json(updated);
}
