import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const payload = await verifyAdminToken(token);
  if (!payload) return Response.json({ error: "Ungültiges Token." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();

  const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
  type Status = (typeof ALLOWED_STATUSES)[number];

  const updates: {
    status?: Status;
    internalNotes?: string;
    totalPriceCents?: number;
  } = {};
  const paymentPatch: {
    markDepositPaid?: boolean;
    markBalancePaid?: boolean;
  } = {};

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return Response.json({ error: "Ungültiger Status." }, { status: 400 });
    }
    updates.status = body.status as Status;
  }
  if (body.internalNotes !== undefined) {
    updates.internalNotes = String(body.internalNotes);
  }
  if (body.totalPriceCents !== undefined) {
    updates.totalPriceCents = Number(body.totalPriceCents);
  }
  if (body.markDepositPaid !== undefined) {
    paymentPatch.markDepositPaid = Boolean(body.markDepositPaid);
  }
  if (body.markBalancePaid !== undefined) {
    paymentPatch.markBalancePaid = Boolean(body.markBalancePaid);
  }

  const hasBookingUpdates = Object.keys(updates).length > 0;
  const hasPaymentUpdates = Object.keys(paymentPatch).length > 0;

  if (!hasBookingUpdates && !hasPaymentUpdates) {
    return Response.json({ error: "Keine Änderungen übergeben." }, { status: 400 });
  }

  const now = new Date();

  let booking:
    | {
        id: string;
        status: Status;
        internalNotes: string | null;
        totalPriceCents: number | null;
        invoice: {
          id: string;
          invoiceNumber: string;
          issueDate: Date;
          depositDueDate: Date;
          balanceDueDate: Date;
          totalAmountCents: number;
          depositAmountCents: number;
          balanceAmountCents: number;
          depositPaidAt: Date | null;
          balancePaidAt: Date | null;
          currency: string;
          emailSentAt: Date | null;
        } | null;
      }
    | null = null;
  try {
    booking = await prisma.$transaction(async (tx) => {
      if (hasBookingUpdates) {
        await tx.booking.update({
          where: { id },
          data: updates,
        });
      }

      if (hasPaymentUpdates) {
        const current = await tx.booking.findUnique({
          where: { id },
          select: {
            status: true,
            invoice: {
              select: {
                id: true,
                depositPaidAt: true,
                balancePaidAt: true,
              },
            },
          },
        });

        if (!current?.invoice) {
          throw new Error("Für diese Buchung existiert keine Rechnung.");
        }

        const updatedInvoice = await tx.invoice.update({
          where: { id: current.invoice.id },
          data: {
            depositPaidAt:
              paymentPatch.markDepositPaid === undefined
                ? undefined
                : paymentPatch.markDepositPaid
                  ? (current.invoice.depositPaidAt ?? now)
                  : null,
            balancePaidAt:
              paymentPatch.markBalancePaid === undefined
                ? undefined
                : paymentPatch.markBalancePaid
                  ? (current.invoice.balancePaidAt ?? now)
                  : null,
          },
          select: {
            depositPaidAt: true,
            balancePaidAt: true,
          },
        });

        if (
          current.status !== "CANCELLED" &&
          updatedInvoice.depositPaidAt &&
          updatedInvoice.balancePaidAt
        ) {
          await tx.booking.update({
            where: { id },
            data: { status: "CONFIRMED" },
          });
        }
      }

      return tx.booking.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          internalNotes: true,
          totalPriceCents: true,
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
    });
  } catch (error) {
    const maybePrismaError = error as { code?: string; message?: string };
    if (maybePrismaError.code === "P2025") {
      return Response.json({ error: "Buchung nicht gefunden." }, { status: 404 });
    }
    if (maybePrismaError.message === "Für diese Buchung existiert keine Rechnung.") {
      return Response.json({ error: maybePrismaError.message }, { status: 400 });
    }
    return Response.json({ error: "Änderung konnte nicht gespeichert werden." }, { status: 500 });
  }

  if (!booking) {
    return Response.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }

  return Response.json({ booking });
}
