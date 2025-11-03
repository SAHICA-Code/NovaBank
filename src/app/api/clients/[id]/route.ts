import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/clients/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "No user" }, { status: 401 });

    const client = await prisma.client.findUnique({
        where: { id: params.id },
        select: { ownerId: true },
    });
    if (!client || client.ownerId !== user.id) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
    }

    // PATCH /api/clients/:id
    export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "No user" }, { status: 401 });

    const existing = await prisma.client.findUnique({
        where: { id: params.id },
        select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== user.id) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const { name, description, phone } = await req.json();

    const data: any = {};
    if (typeof name === "string") data.name = name.trim();
    if (typeof description === "string" || description === null) {
        data.description = description ? String(description).trim() : null;
    }
    if (typeof phone === "string" || phone === null) {
        data.phone = phone ? String(phone).trim() : null;
    }

    if (!data.name && !("description" in data) && !("phone" in data)) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    if (data.name !== undefined && !data.name) {
        return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const updated = await prisma.client.update({
        where: { id: params.id },
        data,
        select: { id: true, name: true, description: true, phone: true, createdAt: true },
    });

    return NextResponse.json(updated);
}
