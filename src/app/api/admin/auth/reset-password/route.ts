import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!token || !newPassword) {
    return Response.json({ error: "Token und neues Passwort erforderlich." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return Response.json({ error: "Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const user = await prisma.adminUser.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
      isActive: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Reset-Link ist ungültig oder abgelaufen." }, { status: 400 });
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

  return Response.json({ ok: true, message: "Passwort wurde erfolgreich geändert." });
}
