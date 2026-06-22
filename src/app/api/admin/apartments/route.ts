import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

type ApartmentPhotoInput = {
  url: string;
  alt?: string;
};

async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureUniqueSlug(baseSlug: string) {
  const base = baseSlug || `apartment-${Date.now()}`;
  let slug = base;
  let counter = 2;

  while (await prisma.apartment.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

function normalizePhotos(photos: unknown): ApartmentPhotoInput[] {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const data = entry as { url?: unknown; alt?: unknown };
      const url = String(data.url ?? "").trim();
      if (!url) return null;
      return {
        url,
        alt: String(data.alt ?? "").trim() || undefined,
      };
    })
    .filter((entry): entry is ApartmentPhotoInput => Boolean(entry));
}

export async function GET() {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const apartments = await prisma.apartment.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });

  return Response.json({ apartments });
}

export async function POST(request: Request) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const shortDescription = String(body.shortDescription ?? "").trim();
    const description = String(body.description ?? "").trim();
    const basePriceCents = Number(body.basePriceCents ?? 0);
    const sortOrder = Number(body.sortOrder ?? 0);
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const photos = normalizePhotos(body.photos);

    if (!title || !description) {
      return Response.json({ error: "Name und Details sind erforderlich." }, { status: 400 });
    }
    if (!Number.isFinite(basePriceCents) || basePriceCents < 0) {
      return Response.json({ error: "Grundpreis ist ungültig." }, { status: 400 });
    }

    const slug = await ensureUniqueSlug(slugify(title));

    const apartment = await prisma.apartment.create({
      data: {
        title,
        slug,
        shortDescription,
        description,
        basePriceCents,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive,
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        photos: {
          create: photos.map((photo, index) => ({
            url: photo.url,
            alt: photo.alt || `${title} Bild ${index + 1}`,
            sortOrder: index,
          })),
        },
      },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
      },
    });

    return Response.json({ apartment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anlegen fehlgeschlagen.";
    return Response.json({ error: message }, { status: 500 });
  }
}
