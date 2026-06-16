import { prisma } from "@/lib/prisma";
import RatesClient from "./rates-client";

export default async function RatesPage() {
  const [apartments, rates] = await Promise.all([
    prisma.apartment.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.rate.findMany({
      orderBy: [{ startDate: "asc" }],
      include: { apartment: { select: { title: true } } },
    }),
  ]);

  const initialRates = rates.map((rate) => ({
    id: rate.id,
    apartmentId: rate.apartmentId,
    apartmentTitle: rate.apartment.title,
    name: rate.name,
    startDate: rate.startDate.toISOString().slice(0, 10),
    endDate: rate.endDate.toISOString().slice(0, 10),
    nightlyPriceCents: rate.nightlyPriceCents,
    minNights: rate.minNights,
    isActive: rate.isActive,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Preise</h1>
      <RatesClient apartments={apartments} initialRates={initialRates} />
    </div>
  );
}
