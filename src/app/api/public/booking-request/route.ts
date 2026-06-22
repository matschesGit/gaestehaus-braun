import { prisma } from "@/lib/prisma";
import {
  buildInvoiceNumber,
  buildPaymentSchedule,
  calculateBookingPrice,
  renderInvoiceHtml,
} from "@/lib/billing";
import { getBookingPricingConfig } from "@/lib/booking-pricing";
import { sendBookingInvoiceEmail } from "@/lib/mailer";

type BookingRequestBody = {
  apartmentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  agbAccepted?: boolean;
  newsletterOptIn?: boolean;
  hasPet?: boolean;
  laundryPackages?: number;
  notes?: string;
};

function parseDateOrNull(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  if (!value) return true;
  const normalized = value.replace(/\s+/g, "");
  if (!/^[+()\-0-9\s/]+$/.test(value)) return false;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 6;
}

function isValidName(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,49}$/.test(value);
}

function isValidStreet(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß0-9.'\-\s]{2,80}$/.test(value);
}

function isValidHouseNumber(value: string): boolean {
  return /^[0-9]{1,5}[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]?([\-/][0-9A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]{1,5})?$/.test(value);
}

function isValidCity(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,79}$/.test(value);
}

function isValidCountry(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,79}$/.test(value);
}

function isValidPostalCode(postalCode: string, country: string): boolean {
  const normalizedCountry = country.trim().toLowerCase();
  if (["deutschland", "germany", "de"].includes(normalizedCountry)) {
    return /^\d{5}$/.test(postalCode);
  }
  return /^[A-Za-z0-9\-\s]{3,10}$/.test(postalCode);
}

export async function POST(request: Request) {
  const body = (await request.json()) as BookingRequestBody;

  const missingErrors: string[] = [];
  if (!body.apartmentId) missingErrors.push("Unterkunft fehlt.");
  if (!body.firstName?.trim()) missingErrors.push("Vorname ist erforderlich.");
  if (!body.lastName?.trim()) missingErrors.push("Nachname ist erforderlich.");
  if (!body.email?.trim()) missingErrors.push("E-Mail ist erforderlich.");
  if (!body.street?.trim()) missingErrors.push("Straße ist erforderlich.");
  if (!body.houseNumber?.trim()) missingErrors.push("Hausnummer ist erforderlich.");
  if (!body.postalCode?.trim()) missingErrors.push("Postleitzahl ist erforderlich.");
  if (!body.city?.trim()) missingErrors.push("Ort ist erforderlich.");
  if (!body.country?.trim()) missingErrors.push("Land ist erforderlich.");
  if (!body.checkIn) missingErrors.push("Anreisedatum ist erforderlich.");
  if (!body.checkOut) missingErrors.push("Abreisedatum ist erforderlich.");
  if (!body.guests) missingErrors.push("Anzahl Gäste ist erforderlich.");

  if (missingErrors.length > 0) {
    return Response.json(
      {
        error: "Bitte Pflichtfelder ausfüllen.",
        errors: missingErrors,
      },
      { status: 400 },
    );
  }

  if (body.agbAccepted !== true) {
    return Response.json(
      { error: "Bitte AGB und Impressum/Disclaimer vor dem Absenden bestätigen." },
      { status: 400 },
    );
  }

  const apartmentId = body.apartmentId!;
  const firstName = body.firstName!.trim();
  const lastName = body.lastName!.trim();
  const email = body.email!.trim().toLowerCase();
  const street = body.street!.trim();
  const houseNumber = body.houseNumber!.trim();
  const postalCode = body.postalCode!.trim();
  const city = body.city!.trim();
  const country = body.country!.trim();
  const guests = body.guests!;
  const hasPet = Boolean(body.hasPet);
  const newsletterOptIn = Boolean(body.newsletterOptIn);
  const laundryPackages = Math.max(0, Number(body.laundryPackages ?? 0));

  const validationErrors: string[] = [];
  if (!isValidName(firstName)) validationErrors.push("Bitte einen gültigen Vornamen eingeben.");
  if (!isValidName(lastName)) validationErrors.push("Bitte einen gültigen Nachnamen eingeben.");
  if (!isValidEmail(email)) validationErrors.push("Bitte eine gültige E-Mail-Adresse eingeben.");
  if (!isValidPhone(body.phone?.trim() || "")) validationErrors.push("Bitte eine gültige Telefonnummer eingeben.");
  if (!isValidStreet(street)) validationErrors.push("Bitte eine gültige Straße eingeben.");
  if (!isValidHouseNumber(houseNumber)) validationErrors.push("Bitte eine gültige Hausnummer eingeben.");
  if (!isValidPostalCode(postalCode, country)) validationErrors.push("Bitte eine gültige Postleitzahl eingeben.");
  if (!isValidCity(city)) validationErrors.push("Bitte einen gültigen Ort eingeben.");
  if (!isValidCountry(country)) validationErrors.push("Bitte ein gültiges Land eingeben.");

  if (validationErrors.length > 0) {
    return Response.json(
      { error: "Bitte Eingaben prüfen.", errors: validationErrors },
      { status: 400 },
    );
  }

  if (guests < 1 || guests > 4) {
    return Response.json({ error: "Please choose between 1 and 4 guests." }, { status: 400 });
  }
  if (laundryPackages > guests) {
    return Response.json({ error: "Laundry packages cannot exceed guest count." }, { status: 400 });
  }

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

  const pricingConfig = await getBookingPricingConfig();

  const pricing = calculateBookingPrice(
    apartment,
    checkIn,
    checkOut,
    {
      guests,
      hasPet,
      laundryPackages,
    },
    pricingConfig,
  );

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        phone: body.phone?.trim() || null,
        street,
        houseNumber,
        postalCode,
        city,
        country,
      },
      create: {
        firstName,
        lastName,
        email,
        phone: body.phone?.trim() || null,
        street,
        houseNumber,
        postalCode,
        city,
        country,
      },
    });

    const booking = await tx.booking.create({
      data: {
        apartmentId: apartment.id,
        customerId: customer.id,
        checkIn,
        checkOut,
        guests,
        extraGuests: Math.max(0, guests - 2),
        hasPet,
        laundryPackages,
        status: "PENDING",
        totalPriceCents: pricing.totalAmountCents,
        currency: apartment.currency,
        newsletterOptIn,
        notes: body.notes?.trim() || null,
      },
      select: {
        id: true,
        status: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        extraGuests: true,
        hasPet: true,
        laundryPackages: true,
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
    const schedule = buildPaymentSchedule(pricing.totalAmountCents, booking.createdAt, checkIn, checkOut);
    const documentHtml = renderInvoiceHtml({
      invoiceNumber,
      apartmentTitle: apartment.title,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        street: customer.street,
        houseNumber: customer.houseNumber,
        postalCode: customer.postalCode,
        city: customer.city,
        country: customer.country,
      },
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        extraGuests: booking.extraGuests,
        hasPet: booking.hasPet,
        laundryPackages: booking.laundryPackages,
        notes: booking.notes,
      },
      pricingConfig,
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
        reminderLevel: 0,
        nextReminderDueAt: schedule.depositDueDate,
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
        reminderLevel: true,
        nextReminderDueAt: true,
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
    invoicePdf: {
      invoiceNumber: result.invoice.invoiceNumber,
      issueDate: result.invoice.issueDate,
      apartmentTitle: apartment.title,
      customerName: `${result.customer.firstName} ${result.customer.lastName}`,
      checkIn: result.booking.checkIn,
      checkOut: result.booking.checkOut,
      totalAmountCents: result.invoice.totalAmountCents,
      depositAmountCents: result.invoice.depositAmountCents,
      balanceAmountCents: result.invoice.balanceAmountCents,
      depositDueDate: result.invoice.depositDueDate,
      balanceDueDate: result.invoice.balanceDueDate,
      currency: result.invoice.currency,
      reminderLevel: result.invoice.reminderLevel,
    },
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
        extraGuests: result.booking.extraGuests,
        hasPet: result.booking.hasPet,
        laundryPackages: result.booking.laundryPackages,
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
