"use client";

import { useState } from "react";
import { checkAvailability, submitBookingRequest } from "@/lib/api-client";

type Props = {
  apartmentId: string;
  apartmentTitle: string;
};

type FormState = {
  checkIn: string;
  checkOut: string;
  guests: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

const INITIAL: FormState = {
  checkIn: "",
  checkOut: "",
  guests: "2",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

type Step = "availability" | "contact" | "success";

export default function BookingRequestForm({ apartmentId, apartmentTitle }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState<Step>("availability");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  async function handleCheckAvailability() {
    if (!form.checkIn || !form.checkOut) {
      setError("Bitte Anreise- und Abreisedatum auswählen.");
      return;
    }
    setLoadingAvail(true);
    setError(null);
    try {
      const result = await checkAvailability(apartmentId, form.checkIn, form.checkOut);
      setAvailable(result.available);
      if (result.available) {
        setStep("contact");
      } else {
        setError(
          result.reason === "booked"
            ? "Dieser Zeitraum ist leider bereits vergeben."
            : "Dieser Zeitraum ist leider gesperrt.",
        );
      }
    } catch {
      setError("Fehler bei der Verfügbarkeitsprüfung. Bitte erneut versuchen.");
    } finally {
      setLoadingAvail(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    setLoadingSubmit(true);
    setError(null);
    try {
      const result = await submitBookingRequest({
        apartmentId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: parseInt(form.guests, 10),
        notes: form.notes || undefined,
      });
      setBookingId(result.booking.id);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoadingSubmit(false);
    }
  }

  if (step === "success") {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">Anfrage eingegangen!</h2>
        <p className="text-stone-500 mb-1">
          Wir haben Ihre Anfrage erhalten und melden uns in Kürze.
        </p>
        <p className="text-stone-400 text-sm">Buchungs-ID: {bookingId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-1">Anfrage stellen</h1>
      <p className="text-stone-500 mb-6">{apartmentTitle}</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Schritt 1: Zeitraum + Verfügbarkeit */}
      <section className="bg-white rounded-2xl shadow p-6 mb-4">
        <h2 className="font-medium text-stone-700 mb-4">1. Reisezeitraum</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Anreise *
            <input
              type="date"
              value={form.checkIn}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => update("checkIn", e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Abreise *
            <input
              type="date"
              value={form.checkOut}
              min={form.checkIn || new Date().toISOString().slice(0, 10)}
              onChange={(e) => update("checkOut", e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
          Anzahl Gäste *
          <select
            value={form.guests}
            onChange={(e) => update("guests", e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Person" : "Personen"}
              </option>
            ))}
          </select>
        </label>

        {available === false && (
          <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4">
            Dieser Zeitraum ist leider nicht verfügbar. Bitte wählen Sie einen anderen Zeitraum.
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckAvailability}
          disabled={loadingAvail}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
        >
          {loadingAvail ? "Prüfe Verfügbarkeit…" : "Verfügbarkeit prüfen"}
        </button>
      </section>

      {/* Schritt 2: Kontaktdaten */}
      {step === "contact" && (
        <form onSubmit={handleSubmit}>
          <section className="bg-white rounded-2xl shadow p-6 mb-4">
            <h2 className="font-medium text-stone-700 mb-4">2. Ihre Kontaktdaten</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1 text-sm text-stone-600">
                Vorname *
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-600">
                Nachname *
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
              E-Mail *
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
              Telefon (optional)
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Nachricht (optional)
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={loadingSubmit}
            className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loadingSubmit ? "Anfrage wird gesendet…" : "Anfrage absenden"}
          </button>
        </form>
      )}
    </div>
  );
}
