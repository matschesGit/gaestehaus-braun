import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();

  const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
  type Status = (typeof ALLOWED_STATUSES)[number];

  const updates: {
    status?: Status;
    internalNotes?: string;
    totalPriceCents?: number;
  } = {};

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return Response.json({ error: "Ungültiger Status." }, { status: 400 });
    }
    updates.status = body.status as Status;
  }
  if (body.internalNotes !== undefined) {
    updates.internalNotes = String(body.internalNotes);
  }
  if (body.totalPriceCents !== undefined) {
    updates.totalPriceCents = Number(body.totalPriceCents);
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: updates,
    select: { id: true, status: true, internalNotes: true, totalPriceCents: true },
  });

  return Response.json({ booking });
}
