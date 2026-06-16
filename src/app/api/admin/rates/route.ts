import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function GET() {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const rates = await prisma.rate.findMany({
    orderBy: [{ startDate: "asc" }],
    include: { apartment: { select: { id: true, title: true } } },
  });

  return Response.json({ rates });
}

export async function POST(request: Request) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json();
  const apartmentId = String(body.apartmentId ?? "");
  const name = String(body.name ?? "").trim();
  const startDate = new Date(String(body.startDate ?? ""));
  const endDate = new Date(String(body.endDate ?? ""));
  const nightlyPriceCents = Number(body.nightlyPriceCents ?? 0);
  const minNights = Number(body.minNights ?? 1);

  if (!apartmentId || !name || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return Response.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }
  if (startDate > endDate) {
    return Response.json({ error: "Startdatum muss vor Enddatum liegen." }, { status: 400 });
  }

  const rate = await prisma.rate.create({
    data: {
      apartmentId,
      name,
      startDate,
      endDate,
      nightlyPriceCents,
      minNights,
      isActive: true,
    },
  });

  return Response.json({ rate }, { status: 201 });
}
