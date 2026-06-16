import { prisma } from "@/lib/prisma";
import {
  buildInvoiceNumber,
  buildPaymentSchedule,
  calculateBookingPrice,
  renderInvoiceHtml,
} from "@/lib/billing";
import { sendBookingInvoiceEmail } from "@/lib/mailer";

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

  const apartmentId = body.apartmentId;
  const firstName = body.firstName.trim();
  const lastName = body.lastName.trim();
  const email = body.email.trim().toLowerCase();
  const guests = body.guests;

  const checkIn = parseDateOrNull(body.checkIn);
  const checkOut = parseDateOrNull(body.checkOut);

  if (!checkIn || !checkOut || checkIn >= checkOut) {
    return Response.json({ error: "Invalid checkIn/checkOut range." }, { status: 400 });
  }

  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: {
      id: true,
      title: true,
      isActive: true,
      maxGuests: true,
      basePriceCents: true,
      currency: true,
      rates: {
        where: { isActive: true },
        orderBy: { startDate: "asc" },
        select: {
          name: true,
          startDate: true,
          endDate: true,
          nightlyPriceCents: true,
        },
      },
    },
  });

  if (!apartment || !apartment.isActive) {
    return Response.json({ error: "Apartment not found." }, { status: 404 });
  }

  if (guests > apartment.maxGuests) {
    return Response.json({ error: "Guest count exceeds apartment capacity." }, { status: 400 });
  }

  const [conflictingBooking, conflictingBlock] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        apartmentId: apartment.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    }),
    prisma.blockedDate.findFirst({
      where: {
        apartmentId: apartment.id,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      select: { reason: true },
    }),
  ]);

  if (conflictingBooking || conflictingBlock) {
    return Response.json(
      { error: "Der gewählte Zeitraum ist nicht mehr verfügbar." },
      { status: 409 },
    );
  }

  const pricing = calculateBookingPrice(apartment, checkIn, checkOut);

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        phone: body.phone?.trim() || null,
      },
      create: {
        firstName,
        lastName,
        email,
        phone: body.phone?.trim() || null,
      },
    });

    const booking = await tx.booking.create({
      data: {
        apartmentId: apartment.id,
        customerId: customer.id,
        checkIn,
        checkOut,
        guests,
        status: "PENDING",
        totalPriceCents: pricing.totalAmountCents,
        currency: apartment.currency,
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
        createdAt: true,
        totalPriceCents: true,
        currency: true,
        notes: true,
      },
    });

    const yearStart = new Date(Date.UTC(booking.createdAt.getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(booking.createdAt.getUTCFullYear() + 1, 0, 1));
    const yearlyCount = await tx.invoice.count({
      where: { createdAt: { gte: yearStart, lt: yearEnd } },
    });

    const invoiceNumber = buildInvoiceNumber(booking.createdAt, yearlyCount + 1);
    const schedule = buildPaymentSchedule(pricing.totalAmountCents, booking.createdAt, checkIn);
    const documentHtml = renderInvoiceHtml({
      invoiceNumber,
      apartmentTitle: apartment.title,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        notes: booking.notes,
      },
      pricing,
      schedule,
    });

    const invoice = await tx.invoice.create({
      data: {
        bookingId: booking.id,
        invoiceNumber,
        issueDate: schedule.issueDate,
        depositDueDate: schedule.depositDueDate,
        balanceDueDate: schedule.balanceDueDate,
        totalAmountCents: schedule.totalAmountCents,
        depositAmountCents: schedule.depositAmountCents,
        balanceAmountCents: schedule.balanceAmountCents,
        currency: apartment.currency,
        documentHtml,
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        depositDueDate: true,
        balanceDueDate: true,
        totalAmountCents: true,
        depositAmountCents: true,
        balanceAmountCents: true,
        currency: true,
        documentHtml: true,
      },
    });

    return { customer, booking, invoice };
  });

  const emailResult = await sendBookingInvoiceEmail({
    to: result.customer.email,
    customerName: `${result.customer.firstName} ${result.customer.lastName}`,
    apartmentTitle: apartment.title,
    invoiceNumber: result.invoice.invoiceNumber,
    bookingId: result.booking.id,
    invoiceHtml: result.invoice.documentHtml,
  });

  if (emailResult.sent) {
    await prisma.invoice.update({
      where: { id: result.invoice.id },
      data: { emailSentAt: new Date() },
    });
  }

  return Response.json(
    {
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        checkIn: result.booking.checkIn,
        checkOut: result.booking.checkOut,
        guests: result.booking.guests,
        apartmentId: result.booking.apartmentId,
        customerId: result.booking.customerId,
        totalPriceCents: result.booking.totalPriceCents,
        currency: result.booking.currency,
      },
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        issueDate: result.invoice.issueDate,
        depositDueDate: result.invoice.depositDueDate,
        balanceDueDate: result.invoice.balanceDueDate,
        totalAmountCents: result.invoice.totalAmountCents,
        depositAmountCents: result.invoice.depositAmountCents,
        balanceAmountCents: result.invoice.balanceAmountCents,
        currency: result.invoice.currency,
        emailSent: emailResult.sent,
      },
      warning: emailResult.sent ? null : emailResult.reason,
    },
    { status: 201 },
  );
}
