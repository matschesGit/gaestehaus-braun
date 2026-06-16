import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const [total, pending, confirmed, inquiry] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "INQUIRY" } }),
  ]);

  const recent = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      apartment: { select: { title: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  const STATUS_LABEL: Record<string, string> = {
    INQUIRY: "Anfrage",
    PENDING: "Ausstehend",
    CONFIRMED: "Bestätigt",
    CANCELLED: "Storniert",
  };
  const STATUS_COLOR: Record<string, string> = {
    INQUIRY: "bg-yellow-100 text-yellow-700",
    PENDING: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-stone-100 text-stone-500",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Dashboard</h1>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gesamt", value: total, color: "border-stone-300" },
          { label: "Anfragen", value: inquiry, color: "border-yellow-400" },
          { label: "Ausstehend", value: pending, color: "border-blue-400" },
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
