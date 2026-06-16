import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      invoice: {
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
          currency: true,
          emailSentAt: true,
        },
      },
    },
  });

  const result = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    notes: b.notes,
    internalNotes: b.internalNotes,
    totalPriceCents: b.totalPriceCents,
    currency: b.currency,
    createdAt: b.createdAt,
    apartment: b.apartment.title,
    customer: {
      firstName: b.customer.firstName,
      lastName: b.customer.lastName,
      email: b.customer.email,
      phone: b.customer.phone,
    },
    invoice: b.invoice
      ? {
          id: b.invoice.id,
          invoiceNumber: b.invoice.invoiceNumber,
          issueDate: b.invoice.issueDate,
          depositDueDate: b.invoice.depositDueDate,
          balanceDueDate: b.invoice.balanceDueDate,
          totalAmountCents: b.invoice.totalAmountCents,
          depositAmountCents: b.invoice.depositAmountCents,
          balanceAmountCents: b.invoice.balanceAmountCents,
          depositPaidAt: b.invoice.depositPaidAt,
          balancePaidAt: b.invoice.balancePaidAt,
          currency: b.invoice.currency,
          emailSentAt: b.invoice.emailSentAt,
        }
      : null,
  }));

  return Response.json({ bookings: result });
}
