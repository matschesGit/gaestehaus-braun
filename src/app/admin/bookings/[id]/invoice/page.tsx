import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          documentHtml: true,
          issueDate: true,
          depositPaidAt: true,
          balancePaidAt: true,
        },
      },
    },
  });

  if (!booking?.invoice) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h1 className="text-xl font-semibold text-stone-800">Rechnung {booking.invoice.invoiceNumber}</h1>
          <p className="text-sm text-stone-500">
            {booking.customer.firstName} {booking.customer.lastName} - {booking.apartment.title}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Anzahlung: {booking.invoice.depositPaidAt ? `bezahlt am ${new Date(booking.invoice.depositPaidAt).toLocaleDateString("de-DE")}` : "offen"} | Restzahlung: {booking.invoice.balancePaidAt ? `bezahlt am ${new Date(booking.invoice.balancePaidAt).toLocaleDateString("de-DE")}` : "offen"}
          </p>
        </div>
        <div className="p-6" dangerouslySetInnerHTML={{ __html: booking.invoice.documentHtml }} />
      </div>
    </div>
  );
}