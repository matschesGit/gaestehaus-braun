import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { sendPaymentConfirmationEmail } from "@/lib/mailer";

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
    paymentType?: "deposit" | "balance" | "full";
    sendEmail?: boolean;
  };

  const paymentType = body.paymentType ?? "deposit";
  const sendEmail = body.sendEmail === true;

  if (!["deposit", "balance", "full"].includes(paymentType)) {
    return Response.json({ error: "Ungültiger Zahlungstyp." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      checkIn: true,
      checkOut: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
      apartment: { select: { title: true } },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          totalAmountCents: true,
          depositAmountCents: true,
          balanceAmountCents: true,
          currency: true,
          depositPaidAt: true,
          balancePaidAt: true,
        },
      },
    },
  });

  if (!booking || !booking.invoice) {
    return Response.json({ error: "Buchung oder Rechnung nicht gefunden." }, { status: 404 });
  }

  let amountCents = 0;
  const now = new Date();

  const updateData: {
    depositPaidAt?: Date | null;
    balancePaidAt?: Date | null;
  } = {};

  if (paymentType === "deposit") {
    amountCents = booking.invoice.depositAmountCents;
    if (!booking.invoice.depositPaidAt) {
      updateData.depositPaidAt = now;
    }
  } else if (paymentType === "balance") {
    amountCents = booking.invoice.balanceAmountCents;
    if (!booking.invoice.balancePaidAt) {
      updateData.balancePaidAt = now;
    }
  } else if (paymentType === "full") {
    amountCents = booking.invoice.totalAmountCents;
    if (!booking.invoice.depositPaidAt) {
      updateData.depositPaidAt = now;
    }
    if (!booking.invoice.balancePaidAt) {
      updateData.balancePaidAt = now;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json(
      { error: "Zahlung ist bereits als bezahlt markiert." },
      { status: 400 },
    );
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: booking.invoice.id },
    data: updateData,
    select: {
      depositPaidAt: true,
      balancePaidAt: true,
      invoiceNumber: true,
      totalAmountCents: true,
      depositAmountCents: true,
      balanceAmountCents: true,
      currency: true,
    },
  });

  if (
    updatedInvoice.depositPaidAt &&
    updatedInvoice.balancePaidAt &&
    booking.invoice
  ) {
    await prisma.booking.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
  }

  let emailResult = { sent: false, reason: null as string | null };

  if (sendEmail && amountCents > 0) {
    emailResult = await sendPaymentConfirmationEmail({
      to: booking.customer.email,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      invoiceNumber: booking.invoice.invoiceNumber,
      apartmentTitle: booking.apartment.title,
      paymentType,
      amountCents,
      currency: booking.invoice.currency,
    });
  }

  return Response.json({
    invoice: {
      depositPaidAt: updatedInvoice.depositPaidAt?.toISOString() ?? null,
      balancePaidAt: updatedInvoice.balancePaidAt?.toISOString() ?? null,
      invoiceNumber: updatedInvoice.invoiceNumber,
    },
    emailSent: emailResult.sent,
    emailError: emailResult.reason,
  });
}
