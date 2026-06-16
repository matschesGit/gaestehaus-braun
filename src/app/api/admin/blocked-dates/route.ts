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

  const blockedDates = await prisma.blockedDate.findMany({
    orderBy: [{ startDate: "asc" }],
    include: { apartment: { select: { id: true, title: true } } },
  });

  return Response.json({ blockedDates });
}

export async function POST(request: Request) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json();
  const apartmentId = String(body.apartmentId ?? "");
  const startDate = new Date(String(body.startDate ?? ""));
  const endDate = new Date(String(body.endDate ?? ""));
  const reason = body.reason ? String(body.reason) : null;

  if (!apartmentId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return Response.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }
  if (startDate > endDate) {
    return Response.json({ error: "Startdatum muss vor Enddatum liegen." }, { status: 400 });
  }

  const blockedDate = await prisma.blockedDate.create({
    data: {
      apartmentId,
      startDate,
      endDate,
      reason,
    },
  });

  return Response.json({ blockedDate }, { status: 201 });
}
