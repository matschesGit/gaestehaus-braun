import { PrismaClient } from "@prisma/client";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

function toFileName(url) {
  if (!url.startsWith("/uploads/apartments/")) return null;
  const fileName = url.replace("/uploads/apartments/", "");
  return fileName || null;
}

function deriveSiblingVariant(fileName) {
  if (fileName.includes("-lg.")) {
    return fileName.replace("-lg.", "-sm.");
  }
  if (fileName.includes("-sm.")) {
    return fileName.replace("-sm.", "-lg.");
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "apartments");
  await mkdir(uploadDir, { recursive: true });

  const photoRows = await prisma.apartmentPhoto.findMany({
    select: { url: true },
  });

  const keep = new Set();

  for (const row of photoRows) {
    const fileName = toFileName(row.url);
    if (!fileName) continue;

    keep.add(fileName);
    const sibling = deriveSiblingVariant(fileName);
    if (sibling) {
      keep.add(sibling);
    }
  }

  const filesOnDisk = await readdir(uploadDir);
  const orphans = filesOnDisk.filter((name) => !keep.has(name));

  console.log(`scan: totalOnDisk=${filesOnDisk.length}, keep=${keep.size}, orphans=${orphans.length}`);

  if (orphans.length > 0) {
    console.log("orphans:");
    for (const fileName of orphans) {
      console.log(` - ${fileName}`);
    }
  }

  if (!apply) {
    console.log("dry-run complete. Re-run with --apply to delete orphan files.");
    return;
  }

  for (const fileName of orphans) {
    await rm(path.join(uploadDir, fileName), { force: true });
  }

  console.log(`deleted=${orphans.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
