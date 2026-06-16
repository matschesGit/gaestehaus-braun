import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Apartment 1: Ferienwohnung Alpenblick
  const apt1 = await prisma.apartment.upsert({
    where: { slug: "alpenblick" },
    update: {},
    create: {
      title: "Ferienwohnung Alpenblick",
      slug: "alpenblick",
      description:
        "Gemütliche Ferienwohnung mit herrlichem Ausblick auf die Berge. Ideal für Paare und kleine Familien. Komplett ausgestattet mit moderner Küche, gemütlichem Wohnzimmer und einer sonnigen Terrasse.",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      basePriceCents: 9500,
      currency: "EUR",
      isActive: true,
      sortOrder: 1,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
            alt: "Bergblick Terrasse",
            sortOrder: 0,
          },
          {
            url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
            alt: "Gemütliches Wohnzimmer",
            sortOrder: 1,
          },
        ],
      },
      rates: {
        create: [
          {
            name: "Hauptsaison",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-08-31"),
            nightlyPriceCents: 12000,
            minNights: 3,
            isActive: true,
          },
          {
            name: "Nebensaison",
            startDate: new Date("2026-09-01"),
            endDate: new Date("2026-12-31"),
            nightlyPriceCents: 9500,
            minNights: 2,
            isActive: true,
          },
        ],
      },
    },
  });

  // Apartment 2: Landhaus Sonnenschein
  const apt2 = await prisma.apartment.upsert({
    where: { slug: "sonnenschein" },
    update: {},
    create: {
      title: "Landhaus Sonnenschein",
      slug: "sonnenschein",
      description:
        "Großzügiges Landhaus mit eigenem Garten, perfekt für Familien und Gruppen. Stilvolle Einrichtung, voll ausgestattete Küche, Grillplatz und Parkplatz direkt am Haus.",
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      basePriceCents: 14000,
      currency: "EUR",
      isActive: true,
      sortOrder: 2,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
            alt: "Landhaus Außenansicht",
            sortOrder: 0,
          },
          {
            url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800",
            alt: "Garten mit Grillplatz",
            sortOrder: 1,
          },
        ],
      },
      rates: {
        create: [
          {
            name: "Hauptsaison",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-08-31"),
            nightlyPriceCents: 18000,
            minNights: 5,
            isActive: true,
          },
          {
            name: "Nebensaison",
            startDate: new Date("2026-09-01"),
            endDate: new Date("2026-12-31"),
            nightlyPriceCents: 14000,
            minNights: 3,
            isActive: true,
          },
        ],
      },
    },
  });

  // Beispiel-Blockierung
  await prisma.blockedDate.createMany({
    skipDuplicates: true,
    data: [
      {
        apartmentId: apt1.id,
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-20"),
        reason: "Eigenbelegung",
      },
    ],
  });

  console.log(`✓ Apartment: ${apt1.title}`);
  console.log(`✓ Apartment: ${apt2.title}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
