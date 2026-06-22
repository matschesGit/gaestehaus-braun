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
        "Zur Gartenseite gelegen, mit stufenlosem separaten Eingang und überdachter Terrasse an der Liegewiese. Die Wohnung (ca. 56 m²) bietet Schlafzimmer, Duschbad, Wohnbereich mit integrierter Essecke und eine separate Küche. Eine zusätzliche Schlafmöglichkeit bietet die Schlafcouch im Wohnbereich.",
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
            url: "https://www.gaestehaus-braun.de/.cm4all/uproc.php/0/Designvorlage/App1/.App1-Terrasse-001.jpg/picture-800?_=1872ccb0f70",
            alt: "Ferienwohnung Alpenblick Terrasse",
            sortOrder: 0,
          },
          {
            url: "https://www.gaestehaus-braun.de/.cm4all/uproc.php/0/Designvorlage/App1/.Wohnzimmer.jpg/picture-800?_=1872ccb07a0",
            alt: "Ferienwohnung Alpenblick Wohnzimmer",
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
        "Diese Wohnung (ca. 56 m²) verfügt über eine große Südterrasse über die gesamte Hausbreite mit Blick in den Vorgarten. Die großzügige Aufteilung verbindet Komfort und Gemütlichkeit: Wohnzimmer mit Schlafcouch, Essplatz, separate Küche mit Spülmaschine und Mikrowelle, Schlafzimmer sowie ein modernes Bad mit zwei Waschbecken und begehbarer Dusche.",
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
            url: "https://www.gaestehaus-braun.de/.cm4all/uproc.php/0/Designvorlage/App2/.App2-Terrasse-5367.jpg/picture-800?_=1872d71fdd0",
            alt: "Landhaus Sonnenschein Terrasse",
            sortOrder: 0,
          },
          {
            url: "https://www.gaestehaus-braun.de/.cm4all/uproc.php/0/Designvorlage/App2/.Wohnzimmer.jpg/picture-800?_=1872d71f218",
            alt: "Landhaus Sonnenschein Wohnzimmer",
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
