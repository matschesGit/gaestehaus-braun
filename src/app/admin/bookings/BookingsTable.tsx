"use client";

import Link from "next/link";
import { useState } from "react";

type Booking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes: string | null;
  internalNotes: string | null;
  totalPriceCents: number | null;
  currency: string;
  createdAt: string;
  apartment: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    depositDueDate: string;
    balanceDueDate: string;
    totalAmountCents: number;
    depositAmountCents: number;
    balanceAmountCents: number;
    depositPaidAt: string | null;
    balancePaidAt: string | null;
    currency: string;
    emailSentAt: string | null;
  } | null;
};

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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

function paymentLabel(date: string | null) {
  if (!date) return "offen";
  return `bezahlt am ${new Date(date).toLocaleDateString("de-DE")}`;
}

export default function BookingsTable({ initial }: { initial: Booking[] }) {
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  async function updateBooking(id: string, patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern.");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data.booking } : b)),
      );
      if (selected?.id === id) setSelected((prev) => prev && { ...prev, ...data.booking });
      setSuccess("Änderung erfolgreich gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filterStatus === "ALL" ? bookings : bookings.filter((b) => b.status === filterStatus);

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["ALL", "PENDING", "CONFIRMED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s
                ? "bg-stone-800 text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-400"
            }`}
          >
            {s === "ALL" ? "Alle" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
              <th className="px-5 py-3 font-medium">Gast</th>
              <th className="px-5 py-3 font-medium">Unterkunft</th>
              <th className="px-5 py-3 font-medium">Anreise</th>
              <th className="px-5 py-3 font-medium">Abreise</th>
              <th className="px-5 py-3 font-medium">Gäste</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                className="border-b border-stone-50 hover:bg-stone-50 cursor-pointer"
                onClick={() => setSelected(b)}
              >
                <td className="px-5 py-3 text-stone-700 min-w-[180px]">
                  {b.customer.firstName} {b.customer.lastName}
                </td>
                <td className="px-5 py-3 text-stone-500 min-w-[220px]">{b.apartment}</td>
                <td className="px-5 py-3 text-stone-500 whitespace-nowrap">
                  {new Date(b.checkIn).toLocaleDateString("de-DE")}
                </td>
                <td className="px-5 py-3 text-stone-500 whitespace-nowrap">
                  {new Date(b.checkOut).toLocaleDateString("de-DE")}
                </td>
                <td className="px-5 py-3 text-stone-500 whitespace-nowrap">{b.guests}</td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(b);
                    }}
                    className="text-amber-600 hover:underline text-xs"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                  Keine Buchungen gefunden.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Detail-Panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">Buchungsdetails</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-stone-400 text-xs mb-2">Reisezeitraum</p>
                  <p className="text-stone-500">Unterkunft: <span className="text-stone-800">{selected.apartment}</span></p>
                  <p className="text-stone-500">
                    Anreise: <span className="text-stone-800">{new Date(selected.checkIn).toLocaleDateString("de-DE")}</span>
                  </p>
                  <p className="text-stone-500">
                    Abreise: <span className="text-stone-800">{new Date(selected.checkOut).toLocaleDateString("de-DE")}</span>
                  </p>
                  <p className="text-stone-500">Gäste: <span className="text-stone-800">{selected.guests}</span></p>
                </div>

                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-stone-400 text-xs mb-2">Kontaktdaten</p>
                  <p className="text-stone-500">Vorname: <span className="text-stone-800">{selected.customer.firstName}</span></p>
                  <p className="text-stone-500">Nachname: <span className="text-stone-800">{selected.customer.lastName}</span></p>
                  <p className="text-stone-500">E-Mail: <span className="text-stone-800">{selected.customer.email}</span></p>
                  <p className="text-stone-500">
                    Telefon: <span className="text-stone-800">{selected.customer.phone || "-"}</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-stone-400 text-xs mb-1">Nachricht des Gastes</p>
                <p className="text-stone-600 text-sm bg-stone-50 rounded-lg p-3 whitespace-pre-wrap">
                  {selected.notes || "-"}
                </p>
              </div>

              <div>
                <p className="text-stone-400 text-xs mb-1">Rechnung</p>
                {selected.invoice ? (
                  <div className="bg-stone-50 rounded-lg p-3 space-y-1 text-sm">
                    <p className="text-stone-600">
                      Rechnungsnummer: <span className="text-stone-800 font-medium">{selected.invoice.invoiceNumber}</span>
                    </p>
                    <p className="text-stone-600">
                      Gesamtbetrag: <span className="text-stone-800">{formatMoney(selected.invoice.totalAmountCents, selected.invoice.currency)}</span>
                    </p>
                    <p className="text-stone-600">
                      Anzahlung: <span className="text-stone-800">{formatMoney(selected.invoice.depositAmountCents, selected.invoice.currency)}</span> bis {new Date(selected.invoice.depositDueDate).toLocaleDateString("de-DE")}
                    </p>
                    <p className="text-stone-600">
                      Restzahlung: <span className="text-stone-800">{formatMoney(selected.invoice.balanceAmountCents, selected.invoice.currency)}</span> bis {new Date(selected.invoice.balanceDueDate).toLocaleDateString("de-DE")}
                    </p>
                    <p className="text-stone-600">
                      Anzahlung Status: <span className="text-stone-800">{paymentLabel(selected.invoice.depositPaidAt)}</span>
                    </p>
                    <p className="text-stone-600">
                      Restzahlung Status: <span className="text-stone-800">{paymentLabel(selected.invoice.balancePaidAt)}</span>
                    </p>
                    <p className="text-stone-600">
                      Versandstatus: <span className="text-stone-800">{selected.invoice.emailSentAt ? `per E-Mail am ${new Date(selected.invoice.emailSentAt).toLocaleDateString("de-DE")}` : "noch nicht versendet"}</span>
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateBooking(selected.id, {
                            markDepositPaid: !selected.invoice?.depositPaidAt,
                          })
                        }
                        disabled={saving}
                        className="px-3 py-1.5 rounded-full border border-stone-300 text-xs text-stone-700 hover:border-stone-500 disabled:opacity-60"
                      >
                        {selected.invoice.depositPaidAt ? "Anzahlung zurücksetzen" : "Anzahlung als bezahlt markieren"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateBooking(selected.id, {
                            markBalancePaid: !selected.invoice?.balancePaidAt,
                          })
                        }
                        disabled={saving}
                        className="px-3 py-1.5 rounded-full border border-stone-300 text-xs text-stone-700 hover:border-stone-500 disabled:opacity-60"
                      >
                        {selected.invoice.balancePaidAt ? "Restzahlung zurücksetzen" : "Restzahlung als bezahlt markieren"}
                      </button>
                    </div>
                    <Link
                      href={`/admin/bookings/${selected.id}/invoice`}
                      target="_blank"
                      className="inline-flex text-amber-700 hover:underline pt-1"
                    >
                      Rechnung öffnen
                    </Link>
                  </div>
                ) : (
                  <p className="text-stone-600 text-sm bg-stone-50 rounded-lg p-3">Keine Rechnung vorhanden.</p>
                )}
              </div>

              <div>
                <label className="text-stone-400 text-xs block mb-1">Status ändern</label>
                <select
                  value={selected.status}
                  onChange={(e) => updateBooking(selected.id, { status: e.target.value })}
                  disabled={saving}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {Object.entries(STATUS_LABEL).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-stone-400 text-xs block mb-1">Interne Notiz</label>
                <textarea
                  defaultValue={selected.internalNotes ?? ""}
                  rows={3}
                  onBlur={(e) => {
                    if (e.target.value !== (selected.internalNotes ?? "")) {
                      updateBooking(selected.id, { internalNotes: e.target.value });
                    }
                  }}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 w-full focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {saving && <p className="text-stone-400 text-xs">Wird gespeichert…</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
