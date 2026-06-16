import { prisma } from "@/lib/prisma";

function parseDateParam(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apartmentId = searchParams.get("apartmentId");
  const checkIn = parseDateParam(searchParams.get("checkIn"));
  const checkOut = parseDateParam(searchParams.get("checkOut"));

  if (!apartmentId || !checkIn || !checkOut || checkIn >= checkOut) {
    return Response.json(
      {
        error:
          "Invalid query. Required: apartmentId, checkIn, checkOut (ISO date), and checkIn < checkOut.",
      },
      { status: 400 },
    );
  }

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        apartmentId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
    }),
    prisma.blockedDate.findMany({
      where: { apartmentId },
      select: {
        startDate: true,
        endDate: true,
        reason: true,
      },
    }),
  ]);

  const conflictingBooking = bookings.some((booking) =>
    rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
  );
  const conflictingBlock = blocks.find((block) =>
    rangesOverlap(checkIn, checkOut, block.startDate, block.endDate),
  );

  return Response.json({
    apartmentId,
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    available: !conflictingBooking && !conflictingBlock,
    reason: conflictingBlock ? conflictingBlock.reason ?? "blocked" : conflictingBooking ? "booked" : null,
  });
}
