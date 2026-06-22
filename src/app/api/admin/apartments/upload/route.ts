import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

function extensionFor(file: File) {
  const original = file.name || "";
  const extFromName = path.extname(original).toLowerCase();
  if (extFromName) return extFromName;

  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  return ".jpg";
}

async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; extension: string | null }> {
  if (mimeType === "image/gif") {
    return { buffer, extension: ".gif" };
  }

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const optimized = await sharp(buffer)
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    return { buffer: optimized, extension: ".webp" };
  } catch {
    // Fallback if sharp binary is not available on the current runtime.
    return { buffer, extension: null };
  }
}

async function createImageVariants(
  inputBuffer: Buffer,
  mimeType: string,
): Promise<{ large: Buffer; small: Buffer; extension: string | null }> {
  if (mimeType === "image/gif") {
    return { large: inputBuffer, small: inputBuffer, extension: ".gif" };
  }

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;

    const normalized = sharp(inputBuffer).rotate();

    const [large, small] = await Promise.all([
      normalized.clone().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer(),
      normalized.clone().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toBuffer(),
    ]);

    return { large, small, extension: ".webp" };
  } catch {
    const { buffer: fallback, extension } = await compressImage(inputBuffer, mimeType);
    return { large: fallback, small: fallback, extension };
  }
}

export async function POST(request: Request) {
  const payload = await ensureAdmin();
  if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return Response.json({ error: "Keine Dateien hochgeladen." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "apartments");
    await mkdir(uploadDir, { recursive: true });

    const uploaded: Array<{ url: string; name: string }> = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return Response.json({ error: `Nur Bilder erlaubt: ${file.name}` }, { status: 400 });
      }

      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const { large, small, extension } = await createImageVariants(inputBuffer, file.type);
      const ext = extension || extensionFor(file);
      const baseName = `${Date.now()}-${randomUUID()}`;
      const largeName = `${baseName}-lg${ext}`;
      const smallName = `${baseName}-sm${ext}`;
      const largeDestination = path.join(uploadDir, largeName);
      const smallDestination = path.join(uploadDir, smallName);

      await Promise.all([
        writeFile(largeDestination, large),
        writeFile(smallDestination, small),
      ]);

      uploaded.push({
        url: `/uploads/apartments/${largeName}`,
        name: file.name,
      });
    }

    return Response.json({ files: uploaded }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
    return Response.json({ error: message }, { status: 500 });
  }
}
