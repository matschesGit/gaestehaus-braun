import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();

  const updates: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    nightlyPriceCents?: number;
    minNights?: number;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) updates.name = String(body.name);
  if (body.startDate !== undefined) updates.startDate = new Date(String(body.startDate));
  if (body.endDate !== undefined) updates.endDate = new Date(String(body.endDate));
  if (body.nightlyPriceCents !== undefined) updates.nightlyPriceCents = Number(body.nightlyPriceCents);
  if (body.minNights !== undefined) updates.minNights = Number(body.minNights);
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

  const rate = await prisma.rate.update({ where: { id }, data: updates });
  return Response.json({ rate });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await context.params;
  await prisma.rate.delete({ where: { id } });
  return Response.json({ ok: true });
}
