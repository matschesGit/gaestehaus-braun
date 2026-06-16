import { prisma } from "@/lib/prisma";
import BookingsTable from "./BookingsTable";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  const serialized = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
    guests: b.guests,
    notes: b.notes,
    internalNotes: b.internalNotes,
    totalPriceCents: b.totalPriceCents,
    currency: b.currency,
    createdAt: b.createdAt.toISOString(),
    apartment: b.apartment.title,
    customer: b.customer,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">
        Buchungen <span className="text-stone-400 text-lg font-normal">({bookings.length})</span>
      </h1>
      <BookingsTable initial={serialized} />
    </div>
  );
}
