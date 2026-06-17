import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const [total, pending, confirmed, invoices] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        totalAmountCents: true,
        depositAmountCents: true,
        balanceAmountCents: true,
        depositDueDate: true,
        balanceDueDate: true,
        depositPaidAt: true,
        balancePaidAt: true,
        reminderLevel: true,
        nextReminderDueAt: true,
        booking: {
          select: {
            id: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const now = new Date();
  const paymentStats = invoices.reduce(
    (acc, invoice) => {
      if (!invoice.depositPaidAt) {
        acc.openAmountCents += invoice.depositAmountCents;
      }
      if (!invoice.balancePaidAt) {
        acc.openAmountCents += invoice.balanceAmountCents;
      }
      if (invoice.depositPaidAt && invoice.balancePaidAt) {
        acc.paidInFull += 1;
      }
      if (invoice.nextReminderDueAt && invoice.nextReminderDueAt <= now) {
        acc.overdueReminders += 1;
      }
      return acc;
    },
    { openAmountCents: 0, paidInFull: 0, overdueReminders: 0 },
  );

  const dueReminderRows = invoices
    .filter((invoice) => invoice.nextReminderDueAt && invoice.nextReminderDueAt <= now)
    .sort((a, b) => (a.nextReminderDueAt!.getTime() - b.nextReminderDueAt!.getTime()))
    .slice(0, 5);

  const recent = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Offen",
    CONFIRMED: "Bestätigt",
    CANCELLED: "Storniert",
  };
  const STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-stone-100 text-stone-500",
  };

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Dashboard</h1>

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Gesamt", value: total, color: "border-stone-300" },
          { label: "Offen", value: pending, color: "border-blue-400" },
          { label: "Bestätigt", value: confirmed, color: "border-green-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}
          >
            <p className="text-2xl font-bold text-stone-800">{value}</p>
            <p className="text-stone-500 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Offener Betrag", value: formatMoney(paymentStats.openAmountCents), color: "border-amber-400" },
          { label: "Voll bezahlt", value: String(paymentStats.paidInFull), color: "border-green-400" },
          { label: "Fällige Mahnungen", value: String(paymentStats.overdueReminders), color: "border-rose-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`bg-white rounded-xl shadow p-4 border-l-4 ${color}`}
          >
            <p className="text-2xl font-bold text-stone-800">{value}</p>
            <p className="text-stone-500 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-700">Zahlungsübersicht / fällige Erinnerungen</h2>
          <Link href="/admin/bookings" className="text-amber-600 hover:underline text-sm">
            Zu den Buchungen →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
                <th className="px-5 py-3 font-medium">Rechnung</th>
                <th className="px-5 py-3 font-medium">Gast</th>
                <th className="px-5 py-3 font-medium">Mahnstufe</th>
                <th className="px-5 py-3 font-medium">Erinnerung fällig</th>
                <th className="px-5 py-3 font-medium">Offener Betrag</th>
              </tr>
            </thead>
            <tbody>
              {dueReminderRows.map((invoice) => {
                const openAmount =
                  (invoice.depositPaidAt ? 0 : invoice.depositAmountCents) +
                  (invoice.balancePaidAt ? 0 : invoice.balanceAmountCents);
                return (
                  <tr key={invoice.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="px-5 py-3 text-stone-700">{invoice.invoiceNumber}</td>
                    <td className="px-5 py-3 text-stone-500">
                      {invoice.booking.customer.firstName} {invoice.booking.customer.lastName}
                    </td>
                    <td className="px-5 py-3 text-stone-500">{invoice.reminderLevel}</td>
                    <td className="px-5 py-3 text-stone-500">
                      {invoice.nextReminderDueAt?.toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{formatMoney(openAmount)}</td>
                  </tr>
                );
              })}
              {dueReminderRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-stone-400">
                    Aktuell keine fälligen Erinnerungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Letzte Buchungen */}
      <div className="bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-700">Neueste Buchungen</h2>
          <Link href="/admin/bookings" className="text-amber-600 hover:underline text-sm">
            Alle anzeigen →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
              <th className="px-5 py-3 font-medium">Gast</th>
              <th className="px-5 py-3 font-medium">Unterkunft</th>
              <th className="px-5 py-3 font-medium">Zeitraum</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((b) => (
              <tr key={b.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-5 py-3 text-stone-700">
                  {b.customer.firstName} {b.customer.lastName}
                </td>
                <td className="px-5 py-3 text-stone-500">{b.apartment.title}</td>
                <td className="px-5 py-3 text-stone-500">
                  {new Date(b.checkIn).toLocaleDateString("de-DE")} –{" "}
                  {new Date(b.checkOut).toLocaleDateString("de-DE")}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-stone-400">
                  Noch keine Buchungen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
