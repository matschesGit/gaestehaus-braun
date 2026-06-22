import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apartmentId = searchParams.get("id");

  if (apartmentId) {
    // Return single apartment
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        photos: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!apartment) {
      return Response.json({ error: "Apartment not found" }, { status: 404 });
    }

    const payload = {
      id: apartment.id,
      title: apartment.title,
      slug: apartment.slug,
      shortDescription: apartment.shortDescription,
      description: apartment.description,
      maxGuests: apartment.maxGuests,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
      basePriceCents: apartment.basePriceCents,
      currency: apartment.currency,
      photos: apartment.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        alt: photo.alt,
        sortOrder: photo.sortOrder,
      })),
    };

    return Response.json(payload);
  }

  // Return all apartments
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
      shortDescription: apartment.shortDescription,
    description: apartment.description,
    maxGuests: apartment.maxGuests,
    bedrooms: apartment.bedrooms,
    bathrooms: apartment.bathrooms,
    basePriceCents: apartment.basePriceCents,
    currency: apartment.currency,
    photos: apartment.photos.map((photo) => ({
        id: photo.id,
      url: photo.url,
      alt: photo.alt,
        sortOrder: photo.sortOrder,
    })),
  }));

  return Response.json({ apartments: payload });
}
