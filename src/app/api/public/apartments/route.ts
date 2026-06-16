import { prisma } from "@/lib/prisma";

export async function GET() {
  const apartments = await prisma.apartment.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      photos: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const payload = apartments.map((apartment) => ({
    id: apartment.id,
    title: apartment.title,
    slug: apartment.slug,
    description: apartment.description,
    maxGuests: apartment.maxGuests,
    bedrooms: apartment.bedrooms,
    bathrooms: apartment.bathrooms,
    basePriceCents: apartment.basePriceCents,
    currency: apartment.currency,
    photos: apartment.photos.map((photo) => ({
      url: photo.url,
      alt: photo.alt,
    })),
  }));

  return Response.json({ apartments: payload });
}
