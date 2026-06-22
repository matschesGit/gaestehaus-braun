import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { sendInvoiceEmail } from "@/lib/mailer";

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    kind?: "invoice" | "reminder";
    nextReminderDueAt?: string | null;
  };
  const kind = body.kind === "reminder" ? "reminder" : "invoice";

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
      apartment: { select: { title: true } },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          documentHtml: true,
          totalAmountCents: true,
          depositAmountCents: true,
          balanceAmountCents: true,
          depositDueDate: true,
          balanceDueDate: true,
          currency: true,
          reminderLevel: true,
          nextReminderDueAt: true,
        },
      },
    },
  });

  if (!booking) {
    return Response.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }
  if (!booking.invoice) {
    return Response.json({ error: "Für diese Buchung existiert keine Rechnung." }, { status: 400 });
  }

  const reminderLevel = kind === "reminder" ? booking.invoice.reminderLevel + 1 : booking.invoice.reminderLevel;

  const emailResult = await sendInvoiceEmail({
    to: booking.customer.email,
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    apartmentTitle: booking.apartment.title,
    invoiceNumber: booking.invoice.invoiceNumber,
    bookingId: booking.id,
    invoiceHtml: booking.invoice.documentHtml,
    invoicePdf: {
      invoiceNumber: booking.invoice.invoiceNumber,
      issueDate: booking.invoice.issueDate,
      apartmentTitle: booking.apartment.title,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmountCents: booking.invoice.totalAmountCents,
      depositAmountCents: booking.invoice.depositAmountCents,
      balanceAmountCents: booking.invoice.balanceAmountCents,
      depositDueDate: booking.invoice.depositDueDate,
      balanceDueDate: booking.invoice.balanceDueDate,
      currency: booking.invoice.currency,
      reminderLevel,
    },
    kind,
    reminderLevel,
  });

  if (!emailResult.sent) {
    return Response.json({ error: emailResult.reason ?? "E-Mail-Versand fehlgeschlagen." }, { status: 502 });
  }

  const now = new Date();
  const requestedNextReminder = asDate(body.nextReminderDueAt);
  const nextReminderDueAt =
    kind === "reminder"
      ? (requestedNextReminder ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
      : booking.invoice.nextReminderDueAt;

  const invoice = await prisma.invoice.update({
    where: { id: booking.invoice.id },
    data: {
      emailSentAt: now,
      reminderLevel,
      lastReminderSentAt: kind === "reminder" ? now : undefined,
      nextReminderDueAt,
    },
    select: {
      id: true,
      invoiceNumber: true,
      emailSentAt: true,
      reminderLevel: true,
      nextReminderDueAt: true,
      lastReminderSentAt: true,
    },
  });

  return Response.json({
    invoice: {
      ...invoice,
      emailSentAt: invoice.emailSentAt?.toISOString() ?? null,
      nextReminderDueAt: invoice.nextReminderDueAt?.toISOString() ?? null,
      lastReminderSentAt: invoice.lastReminderSentAt?.toISOString() ?? null,
    },
  });
}
