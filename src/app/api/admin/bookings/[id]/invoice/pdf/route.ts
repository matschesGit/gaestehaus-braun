import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const { id } = await context.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      checkIn: true,
      checkOut: true,
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          issueDate: true,
          totalAmountCents: true,
          depositAmountCents: true,
          balanceAmountCents: true,
          depositDueDate: true,
          balanceDueDate: true,
          currency: true,
          reminderLevel: true,
        },
      },
    },
  });

  if (!booking?.invoice) {
    return Response.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const pdfBytes = await buildInvoicePdf({
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
    reminderLevel: booking.invoice.reminderLevel,
  });

  const pdfBuffer = Buffer.from(pdfBytes);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${booking.invoice.invoiceNumber}.pdf\"`,
      "Cache-Control": "no-store",
    },
  });
}
