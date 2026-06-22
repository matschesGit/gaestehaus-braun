import { prisma } from "@/lib/prisma";
import ApartmentsManager from "./apartments-manager";

export default async function ApartmentsPage() {
  const apartments = await prisma.apartment.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      photos: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Apartments</h1>
      <ApartmentsManager initialApartments={apartments} />
    </div>
  );
}
