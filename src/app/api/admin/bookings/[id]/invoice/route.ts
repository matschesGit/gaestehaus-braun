import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { createInvoiceForBooking } from "@/lib/invoices";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const { id } = await context.params;

  try {
    const result = await createInvoiceForBooking(id);
    return Response.json({
      invoice: {
        ...result.invoice,
        issueDate: result.invoice.issueDate.toISOString(),
        depositDueDate: result.invoice.depositDueDate.toISOString(),
        balanceDueDate: result.invoice.balanceDueDate.toISOString(),
        depositPaidAt: result.invoice.depositPaidAt?.toISOString() ?? null,
        balancePaidAt: result.invoice.balancePaidAt?.toISOString() ?? null,
        nextReminderDueAt: result.invoice.nextReminderDueAt?.toISOString() ?? null,
        lastReminderSentAt: result.invoice.lastReminderSentAt?.toISOString() ?? null,
        emailSentAt: result.invoice.emailSentAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "BOOKING_NOT_FOUND") {
      return Response.json({ error: "Buchung nicht gefunden." }, { status: 404 });
    }
    if (message === "INVOICE_ALREADY_EXISTS") {
      return Response.json({ error: "Für diese Buchung existiert bereits eine Rechnung." }, { status: 409 });
    }
    return Response.json({ error: "Rechnung konnte nicht erstellt werden." }, { status: 500 });
  }
}
