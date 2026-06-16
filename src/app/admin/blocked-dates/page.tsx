import { prisma } from "@/lib/prisma";
import BlockedDatesClient from "./blocked-dates-client";

export default async function BlockedDatesPage() {
  const [apartments, blockedDates] = await Promise.all([
    prisma.apartment.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.blockedDate.findMany({
      orderBy: [{ startDate: "asc" }],
      include: { apartment: { select: { title: true } } },
    }),
  ]);

  const initialBlocked = blockedDates.map((b) => ({
    id: b.id,
    apartmentId: b.apartmentId,
    apartmentTitle: b.apartment.title,
    startDate: b.startDate.toISOString().slice(0, 10),
    endDate: b.endDate.toISOString().slice(0, 10),
    reason: b.reason,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Sperrzeiten</h1>
      <BlockedDatesClient apartments={apartments} initialBlocked={initialBlocked} />
    </div>
  );
}
