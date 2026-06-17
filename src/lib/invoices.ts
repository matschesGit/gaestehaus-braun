import { prisma } from "@/lib/prisma";
import {
  buildInvoiceNumber,
  buildPaymentSchedule,
  calculateBookingPrice,
  renderInvoiceHtml,
} from "@/lib/billing";

type FullBooking = {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  notes: string | null;
  createdAt: Date;
  currency: string;
  apartment: {
    title: string;
    basePriceCents: number;
    currency: string;
    rates: Array<{
      name: string;
      startDate: Date;
      endDate: Date;
      nightlyPriceCents: number;
      isActive: boolean;
    }>;
  };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

function computeNextReminderDueAt(invoice: {
  depositDueDate: Date;
  balanceDueDate: Date;
  depositPaidAt: Date | null;
  balancePaidAt: Date | null;
}) {
  if (!invoice.depositPaidAt) {
    return invoice.depositDueDate;
  }
  if (!invoice.balancePaidAt) {
    return invoice.balanceDueDate;
  }
  return null;
}

export async function createInvoiceForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      guests: true,
      notes: true,
      createdAt: true,
      currency: true,
      invoice: { select: { id: true } },
      apartment: {
        select: {
          title: true,
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
              isActive: true,
            },
          },
        },
      },
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }
  if (booking.invoice) {
    throw new Error("INVOICE_ALREADY_EXISTS");
  }

  const typedBooking = booking as FullBooking;

  const pricing = calculateBookingPrice(
    {
      title: typedBooking.apartment.title,
      basePriceCents: typedBooking.apartment.basePriceCents,
      currency: typedBooking.apartment.currency,
      rates: typedBooking.apartment.rates,
    },
    typedBooking.checkIn,
    typedBooking.checkOut,
  );

  const invoice = await prisma.$transaction(async (tx) => {
    const yearStart = new Date(Date.UTC(typedBooking.createdAt.getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(typedBooking.createdAt.getUTCFullYear() + 1, 0, 1));
    const yearlyCount = await tx.invoice.count({
      where: { createdAt: { gte: yearStart, lt: yearEnd } },
    });

    const invoiceNumber = buildInvoiceNumber(typedBooking.createdAt, yearlyCount + 1);
    const schedule = buildPaymentSchedule(pricing.totalAmountCents, typedBooking.createdAt, typedBooking.checkIn);

    const documentHtml = renderInvoiceHtml({
      invoiceNumber,
      apartmentTitle: typedBooking.apartment.title,
      customer: {
        firstName: typedBooking.customer.firstName,
        lastName: typedBooking.customer.lastName,
        email: typedBooking.customer.email,
        phone: typedBooking.customer.phone,
      },
      booking: {
        id: typedBooking.id,
        checkIn: typedBooking.checkIn,
        checkOut: typedBooking.checkOut,
        guests: typedBooking.guests,
        notes: typedBooking.notes,
      },
      pricing,
      schedule,
    });

    return tx.invoice.create({
      data: {
        bookingId: typedBooking.id,
        invoiceNumber,
        issueDate: schedule.issueDate,
        depositDueDate: schedule.depositDueDate,
        balanceDueDate: schedule.balanceDueDate,
        totalAmountCents: schedule.totalAmountCents,
        depositAmountCents: schedule.depositAmountCents,
        balanceAmountCents: schedule.balanceAmountCents,
        currency: typedBooking.currency,
        documentHtml,
        reminderLevel: 0,
        nextReminderDueAt: schedule.depositDueDate,
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
        depositPaidAt: true,
        balancePaidAt: true,
        reminderLevel: true,
        nextReminderDueAt: true,
        lastReminderSentAt: true,
        currency: true,
        emailSentAt: true,
        documentHtml: true,
      },
    });
  });

  return { booking: typedBooking, invoice };
}

export function deriveNextReminderDate(invoice: {
  depositDueDate: Date;
  balanceDueDate: Date;
  depositPaidAt: Date | null;
  balancePaidAt: Date | null;
}) {
  return computeNextReminderDueAt(invoice);
}
