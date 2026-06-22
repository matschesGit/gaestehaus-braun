import { prisma } from "@/lib/prisma";

function parseDateParam(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

type OccupiedRange = {
  start: Date;
  end: Date;
};

function mergeOccupiedRanges(ranges: OccupiedRange[]): OccupiedRange[] {
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: OccupiedRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ start: new Date(range.start), end: new Date(range.end) });
      continue;
    }

    if (range.end > last.end) {
      last.end = new Date(range.end);
    }
  }

  return merged;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apartmentId = searchParams.get("apartmentId");
  const horizonDays = Number(searchParams.get("horizonDays") ?? "180");

  if (!apartmentId) {
    return Response.json({ error: "Missing apartmentId." }, { status: 400 });
  }

  const horizon = Number.isFinite(horizonDays) && horizonDays > 0 && horizonDays <= 365 ? horizonDays : 180;
  const today = toUtcDayStart(new Date());
  const horizonEnd = addDays(today, horizon);

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        apartmentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        checkOut: { gt: today },
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
    }),
    prisma.blockedDate.findMany({
      where: {
        apartmentId,
        endDate: { gt: today },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  const occupiedRanges = mergeOccupiedRanges([
    ...bookings.map((booking) => ({
      start: booking.checkIn < today ? today : booking.checkIn,
      end: booking.checkOut > horizonEnd ? horizonEnd : booking.checkOut,
    })),
    ...blocks
      .filter((block) => rangesOverlap(today, horizonEnd, block.startDate, block.endDate))
      .map((block) => ({
        start: block.startDate < today ? today : block.startDate,
        end: block.endDate > horizonEnd ? horizonEnd : block.endDate,
      })),
  ]);

  const windows: Array<{ checkIn: string; checkOut: string }> = [];
  let cursor = today;

  for (const occupied of occupiedRanges) {
    if (occupied.start > cursor) {
      windows.push({
        checkIn: cursor.toISOString(),
        checkOut: occupied.start.toISOString(),
      });
    }

    if (occupied.end > cursor) {
      cursor = occupied.end;
    }
  }

  if (cursor < horizonEnd) {
    windows.push({
      checkIn: cursor.toISOString(),
      checkOut: horizonEnd.toISOString(),
    });
  }

  return Response.json({
    apartmentId,
    horizonDays: horizon,
    windows: windows.filter((window) => parseDateParam(window.checkIn) && parseDateParam(window.checkOut)).slice(0, 8),
  });
}
