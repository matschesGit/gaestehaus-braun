import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return Response.json({ error: "E-Mail erforderlich." }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });

  // Immer 200 zurückgeben, um User-Enumeration zu vermeiden.
  if (!user || !user.isActive) {
    return Response.json({
      ok: true,
      message: "Wenn die E-Mail existiert, wurde ein Reset-Link erstellt.",
    });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const origin = new URL(request.url).origin;
  const resetLink = `${origin}/admin/reset-password?token=${token}`;

  if (process.env.NODE_ENV !== "production") {
    return Response.json({
      ok: true,
      message: "Reset-Link wurde erstellt.",
      resetLink,
    });
  }

  return Response.json({
    ok: true,
    message: "Wenn die E-Mail existiert, wurde ein Reset-Link erstellt.",
  });
}
