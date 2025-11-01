import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// === GET: listar clientes del usuario autenticado ===
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const clients = await prisma.client.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "desc" }, // o { name: "asc" } si prefieres alfabético
    });

    return NextResponse.json(clients);
    }

    // === POST: crear cliente ===
    export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { name, description, phone } = await req.json();

    if (!name || !name.trim()) {
        return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const client = await prisma.client.create({
        data: {
        name: name.trim(),
        description: description ? String(description).trim() : null,
        phone: phone ? String(phone).trim() : null,
        ownerId: user.id,
        },
    });

    return NextResponse.json(client);
}
