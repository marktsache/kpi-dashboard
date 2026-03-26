import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = userUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, role, photoUrl } = parseResult.data;

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  // Check email uniqueness if changing email
  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits." },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
  if (password && password.length >= 6) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, photoUrl: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Prevent self-deletion
  if (session.user?.id === id) {
    return NextResponse.json(
      { error: "Sie können Ihren eigenen Account nicht löschen." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
