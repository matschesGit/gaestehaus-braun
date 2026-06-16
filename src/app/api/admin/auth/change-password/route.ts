import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = token ? await verifyAdminToken(token) : null;

  if (!payload) {
    return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return Response.json(
      { error: "Aktuelles und neues Passwort sind erforderlich." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return Response.json(
      { error: "Passwort muss mindestens 8 Zeichen haben." },
      { status: 400 },
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: payload.userId },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validCurrentPassword) {
    return Response.json({ error: "Aktuelles Passwort ist nicht korrekt." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });

  return Response.json({ ok: true, message: "Passwort wurde aktualisiert." });
}