"use client";

import Link from "next/link";
import { useState } from "react";

type Booking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  extraGuests: number;
  hasPet: boolean;
  laundryPackages: number;
  newsletterOptIn: boolean;
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
    reminderLevel: number;
    nextReminderDueAt: string | null;
    lastReminderSentAt: string | null;
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

function dateToInputValue(date: string | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function isPaymentOutstanding(booking: Booking): boolean {
  if (booking.status === "CANCELLED") return false;
  if (!booking.invoice) return false;
  return !booking.invoice.depositPaidAt || !booking.invoice.balancePaidAt;
}

function hasNewsletterOptIn(booking: Booking): boolean {
  return booking.newsletterOptIn;
}

export default function BookingsTable({ initial }: { initial: Booking[] }) {
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [nextReminderDate, setNextReminderDate] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "payment" | "cancel";
    paymentType?: "deposit" | "balance" | "full";
  } | null>(null);

  function openDetails(booking: Booking) {
    setSelected(booking);
    setNextReminderDate(dateToInputValue(booking.invoice?.nextReminderDueAt ?? null));
  }

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
      if (selected?.id === id) {
        setSelected((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...data.booking };
          if (next.invoice) {
            setNextReminderDate(dateToInputValue(next.invoice.nextReminderDueAt));
          }
          return next;
        });
      }
      setSuccess("Änderung erfolgreich gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function createInvoice(id: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rechnung konnte nicht erstellt werden.");

      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, invoice: data.invoice } : b)));
      setSelected((prev) => {
        if (!prev || prev.id !== id) return prev;
        setNextReminderDate(dateToInputValue(data.invoice.nextReminderDueAt));
        return { ...prev, invoice: data.invoice };
      });
      setSuccess("Rechnung wurde erstellt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoice(id: string, kind: "invoice" | "reminder") {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/invoice/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          nextReminderDueAt: kind === "reminder" && nextReminderDate ? nextReminderDate : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versand fehlgeschlagen.");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id && b.invoice ? { ...b, invoice: { ...b.invoice, ...data.invoice } } : b,
        ),
      );
      setSelected((prev) => {
        if (!prev || prev.id !== id || !prev.invoice) return prev;
        const next = { ...prev, invoice: { ...prev.invoice, ...data.invoice } };
        setNextReminderDate(dateToInputValue(next.invoice.nextReminderDueAt));
        return next;
      });
      setSuccess(kind === "invoice" ? "Rechnung wurde versendet." : "Mahnung wurde versendet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmPayment(bookingId: string, paymentType: "deposit" | "balance" | "full", sendEmail: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setConfirmDialog(null);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payment/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType, sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler bei der Zahlungsbestätigung.");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId && b.invoice
            ? {
                ...b,
                invoice: {
                  ...b.invoice,
                  depositPaidAt: data.invoice.depositPaidAt,
                  balancePaidAt: data.invoice.balancePaidAt,
                },
              }
            : b,
        ),
      );

      if (selected?.id === bookingId && selected.invoice) {
        setSelected((prev) => {
          if (!prev || !prev.invoice) return prev;
          return {
            ...prev,
            invoice: {
              ...prev.invoice,
              depositPaidAt: data.invoice.depositPaidAt,
              balancePaidAt: data.invoice.balancePaidAt,
            },
          };
        });
      }

      const emailMsg = sendEmail ? " und Bestätigungs-Mail versendet" : "";
      setSuccess(`Zahlung bestätigt${emailMsg}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking(bookingId: string, sendEmail: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setConfirmDialog(null);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler bei der Stornierung.");

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b)),
      );

      if (selected?.id === bookingId) {
        setSelected((prev) => {
          if (!prev) return prev;
          return { ...prev, status: "CANCELLED" };
        });
      }

      const emailMsg = sendEmail ? " und Stornierungsmitteilung versendet" : "";
      setSuccess(`Buchung storniert${emailMsg}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  const filtered =
    filterStatus === "ALL"
      ? bookings
      : filterStatus === "PENDING_PAYMENT"
        ? bookings.filter(isPaymentOutstanding)
        : filterStatus === "NEWSLETTER_OPTIN"
          ? bookings.filter(hasNewsletterOptIn)
        : bookings.filter((b) => b.status === filterStatus);

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
        {[
          { key: "ALL", label: "Alle" },
          { key: "PENDING", label: "Offen" },
          { key: "PENDING_PAYMENT", label: "Zahlungen ausstehend" },
          { key: "NEWSLETTER_OPTIN", label: "Newsletter" },
          { key: "CONFIRMED", label: "Bestätigt" },
          { key: "CANCELLED", label: "Storniert" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === f.key
                ? "bg-stone-800 text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-400"
            }`}
          >
            {f.label}
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
                onClick={() => openDetails(b)}
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
                      openDetails(b);
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
                  <p className="text-stone-500">
                    Zusatzpersonen: <span className="text-stone-800">{selected.extraGuests}</span>
                  </p>
                  <p className="text-stone-500">
                    Haustier: <span className="text-stone-800">{selected.hasPet ? "ja" : "nein"}</span>
                  </p>
                  <p className="text-stone-500">
                    Wäschepakete: <span className="text-stone-800">{selected.laundryPackages}</span>
                  </p>
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
                <p className="text-stone-400 text-xs mb-1">Newsletter</p>
                <p className="text-stone-600 text-sm bg-stone-50 rounded-lg p-3">
                  {selected.newsletterOptIn
                    ? "Ja, Gast möchte über Angebote informiert werden."
                    : "Nein, kein Newsletter-Opt-in."}
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
                      Mahnstufe: <span className="text-stone-800">{selected.invoice.reminderLevel}</span>
                    </p>
                    <p className="text-stone-600">
                      Nächste Erinnerung: <span className="text-stone-800">{selected.invoice.nextReminderDueAt ? new Date(selected.invoice.nextReminderDueAt).toLocaleDateString("de-DE") : "nicht geplant"}</span>
                    </p>
                    <p className="text-stone-600">
                      Versandstatus: <span className="text-stone-800">{selected.invoice.emailSentAt ? `per E-Mail am ${new Date(selected.invoice.emailSentAt).toLocaleDateString("de-DE")}` : "noch nicht versendet"}</span>
                    </p>

                    {/* Payment Confirmation Buttons */}
                    <div className="pt-3 border-t border-stone-200 space-y-2">
                      {!selected.invoice.depositPaidAt && (
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ type: "payment", paymentType: "deposit" })}
                          disabled={saving}
                          className="w-full px-3 py-1.5 rounded-full border border-green-300 text-xs text-green-800 bg-green-50 hover:border-green-500 disabled:opacity-60"
                        >
                          Anzahlung bestätigen
                        </button>
                      )}
                      {selected.invoice.depositPaidAt && !selected.invoice.balancePaidAt && (
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ type: "payment", paymentType: "balance" })}
                          disabled={saving}
                          className="w-full px-3 py-1.5 rounded-full border border-green-300 text-xs text-green-800 bg-green-50 hover:border-green-500 disabled:opacity-60"
                        >
                          Restzahlung bestätigen
                        </button>
                      )}
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => sendInvoice(selected.id, "invoice")}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-full border border-amber-300 text-xs text-amber-800 hover:border-amber-500 disabled:opacity-60"
                      >
                        Rechnung erneut senden
                      </button>
                      <button
                        type="button"
                        onClick={() => sendInvoice(selected.id, "reminder")}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-full border border-rose-300 text-xs text-rose-800 hover:border-rose-500 disabled:opacity-60"
                      >
                        Mahnung senden
                      </button>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-stone-500">Erinnerungsdatum</label>
                      <input
                        type="date"
                        value={nextReminderDate}
                        onChange={(e) => setNextReminderDate(e.target.value)}
                        className="border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-700"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateBooking(selected.id, {
                            nextReminderDueAt: nextReminderDate || null,
                          })
                        }
                        disabled={saving}
                        className="px-2.5 py-1 rounded-md border border-stone-300 text-xs text-stone-700 hover:border-stone-500 disabled:opacity-60"
                      >
                        Speichern
                      </button>
                    </div>
                    <div className="pt-1 flex flex-wrap gap-2 items-center">
                      <label className="text-xs text-stone-500">Mahnstufe</label>
                      <button
                        type="button"
                        onClick={() =>
                          updateBooking(selected.id, {
                            reminderLevel: Math.max(0, selected.invoice!.reminderLevel - 1),
                          })
                        }
                        disabled={saving}
                        className="px-2 py-1 rounded-md border border-stone-300 text-xs text-stone-700 hover:border-stone-500 disabled:opacity-60"
                      >
                        -
                      </button>
                      <span className="text-xs font-medium text-stone-700 min-w-6 text-center">
                        {selected.invoice.reminderLevel}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateBooking(selected.id, {
                            reminderLevel: selected.invoice!.reminderLevel + 1,
                          })
                        }
                        disabled={saving}
                        className="px-2 py-1 rounded-md border border-stone-300 text-xs text-stone-700 hover:border-stone-500 disabled:opacity-60"
                      >
                        +
                      </button>
                    </div>
                    <Link
                      href={`/api/admin/bookings/${selected.id}/invoice/pdf`}
                      target="_blank"
                      className="inline-flex text-amber-700 hover:underline pt-1"
                    >
                      Rechnung als PDF öffnen
                    </Link>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-lg p-3 space-y-3">
                    <p className="text-stone-600 text-sm">Keine Rechnung vorhanden.</p>
                    <button
                      type="button"
                      onClick={() => createInvoice(selected.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-full border border-amber-300 text-xs text-amber-800 hover:border-amber-500 disabled:opacity-60"
                    >
                      Rechnung manuell erstellen
                    </button>
                  </div>
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
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setConfirmDialog({ type: "cancel" })}
                disabled={saving || selected.status === "CANCELLED"}
                className="w-full px-3 py-2 rounded-lg border border-red-300 text-xs text-red-800 bg-red-50 hover:border-red-500 disabled:opacity-60"
              >
                Buchung stornieren
              </button>

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

      {/* Confirmation Dialogs */}
      {confirmDialog?.type === "payment" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Zahlung bestätigen</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-stone-600 text-sm">
                Bestätigen Sie den Geldeingang und soll eine Zahlungsbestätigungs-Mail versendet werden?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    confirmPayment(selected!.id, confirmDialog.paymentType!, false);
                  }}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:border-stone-500 disabled:opacity-60"
                >
                  Nur speichern
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmPayment(selected!.id, confirmDialog.paymentType!, true);
                  }}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
                >
                  Speichern + Mail
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:border-stone-500 disabled:opacity-60"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog?.type === "cancel" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Buchung stornieren</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-stone-600 text-sm">
                Bestätigen Sie die Stornierung und soll eine Stornierungsmitteilung an den Gast versendet werden?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    cancelBooking(selected!.id, false);
                  }}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:border-stone-500 disabled:opacity-60"
                >
                  Nur stornieren
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelBooking(selected!.id, true);
                  }}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                >
                  Stornieren + Mail
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:border-stone-500 disabled:opacity-60"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
