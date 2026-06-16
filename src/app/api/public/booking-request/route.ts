import { prisma } from "@/lib/prisma";

type BookingRequestBody = {
  apartmentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  notes?: string;
};

function parseDateOrNull(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: Request) {
  const body = (await request.json()) as BookingRequestBody;

  if (
    !body.apartmentId ||
    !body.firstName ||
    !body.lastName ||
    !body.email ||
    !body.checkIn ||
    !body.checkOut ||
    !body.guests
  ) {
    return Response.json(
      {
        error:
          "Missing fields. Required: apartmentId, firstName, lastName, email, checkIn, checkOut, guests.",
      },
      { status: 400 },
    );
  }

  const checkIn = parseDateOrNull(body.checkIn);
  const checkOut = parseDateOrNull(body.checkOut);

  if (!checkIn || !checkOut || checkIn >= checkOut) {
    return Response.json({ error: "Invalid checkIn/checkOut range." }, { status: 400 });
  }

  const apartment = await prisma.apartment.findUnique({
    where: { id: body.apartmentId },
    select: { id: true, isActive: true, maxGuests: true },
  });

  if (!apartment || !apartment.isActive) {
    return Response.json({ error: "Apartment not found." }, { status: 404 });
  }

  if (body.guests > apartment.maxGuests) {
    return Response.json({ error: "Guest count exceeds apartment capacity." }, { status: 400 });
  }

  const customer = await prisma.customer.upsert({
    where: { email: body.email.trim().toLowerCase() },
    update: {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone?.trim() || null,
    },
    create: {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
    },
  });

  const booking = await prisma.booking.create({
    data: {
      apartmentId: apartment.id,
      customerId: customer.id,
      checkIn,
      checkOut,
      guests: body.guests,
      status: "INQUIRY",
      notes: body.notes?.trim() || null,
    },
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      apartmentId: true,
      customerId: true,
    },
  });

  return Response.json({ booking }, { status: 201 });
}
