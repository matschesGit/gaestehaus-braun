import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { sendCancellationEmail } from "@/lib/mailer";

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
    sendEmail?: boolean;
  };

  const sendEmail = body.sendEmail === true;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      status: true,
      checkIn: true,
      checkOut: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
      apartment: { select: { title: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          totalAmountCents: true,
          depositPaidAt: true,
          balancePaidAt: true,
          currency: true,
        },
      },
    },
  });

  if (!booking || !booking.invoice) {
    return Response.json({ error: "Buchung oder Rechnung nicht gefunden." }, { status: 404 });
  }

  if (booking.status === "CANCELLED") {
    return Response.json(
      { error: "Buchung ist bereits storniert." },
      { status: 400 },
    );
  }

  const calculateRefund = (invoice: {
    totalAmountCents: number;
    depositPaidAt: Date | null;
    balancePaidAt: Date | null;
  }): number => {
    let paid = 0;
    if (invoice.depositPaidAt) paid += Math.round(invoice.totalAmountCents * 0.25);
    if (invoice.balancePaidAt) paid += invoice.totalAmountCents - Math.round(invoice.totalAmountCents * 0.25);
    return Math.max(0, invoice.totalAmountCents - paid);
  };

  const refundAmountCents = calculateRefund(booking.invoice);

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });

  let emailResult = { sent: false, reason: null as string | null };

  if (sendEmail) {
    const result = await sendCancellationEmail({
      to: booking.customer.email,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      invoiceNumber: booking.invoice.invoiceNumber,
      apartmentTitle: booking.apartment.title,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      refundAmountCents,
      currency: booking.invoice.currency,
    });
    emailResult = {
      sent: result.sent,
      reason: result.reason ?? null,
    };
  }

  return Response.json({
    booking: updatedBooking,
    refundAmountCents,
    emailSent: emailResult.sent,
    emailError: emailResult.reason,
  });
}
