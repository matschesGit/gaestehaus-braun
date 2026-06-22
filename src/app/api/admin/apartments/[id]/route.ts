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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const shortDescription = String(body.shortDescription ?? "").trim();
    const description = String(body.description ?? "").trim();
    const basePriceCents = Number(body.basePriceCents ?? 0);
    const sortOrder = Number(body.sortOrder ?? 0);
    const isActive = Boolean(body.isActive);
    const photos = normalizePhotos(body.photos);

    if (!title || !description) {
      return Response.json({ error: "Name und Details sind erforderlich." }, { status: 400 });
    }
    if (!Number.isFinite(basePriceCents) || basePriceCents < 0) {
      return Response.json({ error: "Grundpreis ist ungültig." }, { status: 400 });
    }

    const apartment = await prisma.apartment.update({
      where: { id },
      data: {
        title,
        shortDescription,
        description,
        basePriceCents,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive,
        photos: {
          deleteMany: {},
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

    return Response.json({ apartment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await context.params;
  await prisma.apartment.delete({ where: { id } });
  return Response.json({ ok: true });
}
