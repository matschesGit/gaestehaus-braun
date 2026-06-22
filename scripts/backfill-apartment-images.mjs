import { PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const prisma = new PrismaClient();

function extensionFromMime(mimeType) {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("gif")) return ".gif";
  return ".jpg";
}

function isAlreadyVariant(url) {
  return url.includes("-lg.") || url.includes("-sm.");
}

async function loadBufferForPhoto(url) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: contentType,
    };
  }

  if (url.startsWith("/")) {
    const absPath = path.join(process.cwd(), "public", url);
    const buffer = await readFile(absPath);
    const ext = path.extname(url).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";

    return { buffer, mimeType };
  }

  throw new Error(`Unsupported URL format: ${url}`);
}

async function createVariants(buffer, mimeType) {
  if (mimeType === "image/gif") {
    return {
      large: buffer,
      small: buffer,
      extension: ".gif",
    };
  }

  const pipeline = sharp(buffer).rotate();
  const [large, small] = await Promise.all([
    pipeline.clone().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer(),
    pipeline.clone().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toBuffer(),
  ]);

  return {
    large,
    small,
    extension: ".webp",
  };
}

async function main() {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "apartments");
  await mkdir(uploadDir, { recursive: true });

  const photos = await prisma.apartmentPhoto.findMany({
    orderBy: [{ createdAt: "asc" }],
  });

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of photos) {
    if (isAlreadyVariant(photo.url)) {
      skipped += 1;
      continue;
    }

    try {
      const { buffer, mimeType } = await loadBufferForPhoto(photo.url);
      const { large, small, extension } = await createVariants(buffer, mimeType);
      const ext = extension || extensionFromMime(mimeType);
      const baseName = `${Date.now()}-${randomUUID()}`;
      const largeName = `${baseName}-lg${ext}`;
      const smallName = `${baseName}-sm${ext}`;

      await Promise.all([
        writeFile(path.join(uploadDir, largeName), large),
        writeFile(path.join(uploadDir, smallName), small),
      ]);

      await prisma.apartmentPhoto.update({
        where: { id: photo.id },
        data: { url: `/uploads/apartments/${largeName}` },
      });

      migrated += 1;
      console.log(`migrated: ${photo.id}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`failed: ${photo.id} -> ${message}`);
    }
  }

  console.log(`done: migrated=${migrated}, skipped=${skipped}, failed=${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
