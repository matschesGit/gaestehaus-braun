"use client";

import { useEffect, useState } from "react";
import { fetchAvailabilityWindows, submitBookingRequest } from "@/lib/api-client";
import Link from "next/link";

type Props = {
  apartmentId: string;
  apartmentTitle: string;
};

type FormState = {
  checkIn: string;
  checkOut: string;
  guests: string;
  hasPet: boolean;
  laundryPackages: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  notes: string;
  agbAccepted: boolean;
  newsletterOptIn: boolean;
};

const INITIAL: FormState = {
  checkIn: "",
  checkOut: "",
  guests: "2",
  hasPet: false,
  laundryPackages: "0",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  notes: "",
  agbAccepted: false,
  newsletterOptIn: false,
};

type Step = "travelers" | "dates" | "contact" | "extras" | "success";

type AvailabilityWindow = {
  checkIn: string;
  checkOut: string;
};

function formatDateRange(checkIn: string, checkOut: string) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return `${formatter.format(new Date(checkIn))} – ${formatter.format(new Date(checkOut))}`;
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  if (!value.trim()) return true;
  if (!/^[+()\-0-9\s/]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6;
}

function isValidName(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,49}$/.test(value.trim());
}

function isValidStreet(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß0-9.'\-\s]{2,80}$/.test(value.trim());
}

function isValidHouseNumber(value: string): boolean {
  return /^[0-9]{1,5}[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]?([\-/][0-9A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]{1,5})?$/.test(value.trim());
}

function isValidCity(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,79}$/.test(value.trim());
}

function isValidCountry(value: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'\-\s]{1,79}$/.test(value.trim());
}

function isValidPostalCode(postalCode: string, country: string): boolean {
  const code = postalCode.trim();
  const normalizedCountry = country.trim().toLowerCase();
  if (["deutschland", "germany", "de"].includes(normalizedCountry)) {
    return /^\d{5}$/.test(code);
  }
  return /^[A-Za-z0-9\-\s]{3,10}$/.test(code);
}

function validateContactForm(form: FormState): string[] {
  const errors: string[] = [];
  if (!form.firstName.trim()) errors.push("Vorname ist erforderlich.");
  else if (!isValidName(form.firstName)) errors.push("Bitte einen gültigen Vornamen eingeben.");

  if (!form.lastName.trim()) errors.push("Nachname ist erforderlich.");
  else if (!isValidName(form.lastName)) errors.push("Bitte einen gültigen Nachnamen eingeben.");

  if (!form.street.trim()) errors.push("Straße ist erforderlich.");
  else if (!isValidStreet(form.street)) errors.push("Bitte eine gültige Straße eingeben.");

  if (!form.houseNumber.trim()) errors.push("Hausnummer ist erforderlich.");
  else if (!isValidHouseNumber(form.houseNumber)) errors.push("Bitte eine gültige Hausnummer eingeben.");

  if (!form.postalCode.trim()) errors.push("Postleitzahl ist erforderlich.");
  else if (!isValidPostalCode(form.postalCode, form.country)) errors.push("Bitte eine gültige Postleitzahl eingeben.");

  if (!form.city.trim()) errors.push("Ort ist erforderlich.");
  else if (!isValidCity(form.city)) errors.push("Bitte einen gültigen Ort eingeben.");

  if (!form.country.trim()) errors.push("Land ist erforderlich.");
  else if (!isValidCountry(form.country)) errors.push("Bitte ein gültiges Land eingeben.");

  if (!form.email.trim()) errors.push("E-Mail ist erforderlich.");
  else if (!isValidEmail(form.email)) errors.push("Bitte eine gültige E-Mail-Adresse eingeben.");

  if (!isValidPhone(form.phone)) errors.push("Bitte eine gültige Telefonnummer eingeben.");
  return errors;
}

function formatValidationErrors(errors: string[]): string {
  return `Bitte korrigieren:\n- ${errors.join("\n- ")}`;
}

export default function BookingRequestForm({ apartmentId, apartmentTitle }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState<Step>("travelers");
  const [loadingWindows, setLoadingWindows] = useState(false);
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([]);
  const [availabilityWindowsError, setAvailabilityWindowsError] = useState<string | null>(null);
  const [visibleMonthStart, setVisibleMonthStart] = useState(() => utcMonthStart(new Date()));
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWindows() {
      setLoadingWindows(true);
      setAvailabilityWindowsError(null);
      try {
        const windows = await fetchAvailabilityWindows(apartmentId);
        if (!cancelled) {
          setAvailabilityWindows(windows);
        }
      } catch {
        if (!cancelled) {
          setAvailabilityWindows([]);
          setAvailabilityWindowsError("Die verfügbaren Zeiträume konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoadingWindows(false);
        }
      }
    }

    loadWindows();

    return () => {
      cancelled = true;
    };
  }, [apartmentId]);

  function update(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  function findWindowForDate(date: Date) {
    const iso = toDayKey(date);
    return availabilityWindows.find((window) => window.checkIn.slice(0, 10) <= iso && iso < window.checkOut.slice(0, 10));
  }

  function handleCalendarDayClick(date: Date) {
    const window = findWindowForDate(date);
    if (!window) return;

    const clickedDate = toDayKey(date);

    if (!form.checkIn || form.checkOut) {
      setForm((prev) => ({
        ...prev,
        checkIn: clickedDate,
        checkOut: "",
      }));
      setError(null);
      return;
    }

    if (clickedDate <= form.checkIn) {
      setForm((prev) => ({
        ...prev,
        checkIn: clickedDate,
        checkOut: "",
      }));
      setError(null);
      return;
    }

    const selectedWindow = findWindowForDate(new Date(form.checkIn));
    if (!selectedWindow) {
      setError("Der gewählte Zeitraum ist nicht verfügbar.");
      return;
    }

    if (clickedDate >= selectedWindow.checkOut.slice(0, 10)) {
      setError("Über graue Tage hinweg kann kein Zeitraum gewählt werden. Bitte innerhalb eines freien Blocks bleiben.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      checkOut: clickedDate,
    }));
    setError(null);
  }

  const monthCards = [] as Array<{ monthStart: Date; days: Date[] }>;
  const today = utcDay(new Date());
  const currentMonthStart = utcMonthStart(new Date());
  for (let offset = 0; offset < 2; offset += 1) {
    const monthStart = addMonths(visibleMonthStart, offset);
    const days: Date[] = [];
    const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day)));
    }
    monthCards.push({ monthStart, days });
  }

  function goToPreviousMonths() {
    setVisibleMonthStart((prev) => {
      const previous = addMonths(prev, -1);
      return previous < currentMonthStart ? currentMonthStart : previous;
    });
  }

  function goToNextMonths() {
    setVisibleMonthStart((prev) => addMonths(prev, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contactErrors = validateContactForm(form);
    if (contactErrors.length > 0) {
      setError(formatValidationErrors(contactErrors));
      return;
    }
    if (!form.agbAccepted) {
      setError("Bitte bestätigen Sie, dass Sie die AGB gelesen und akzeptiert haben.");
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
        street: form.street,
        houseNumber: form.houseNumber,
        postalCode: form.postalCode,
        city: form.city,
        country: form.country,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: parseInt(form.guests, 10),
        agbAccepted: form.agbAccepted,
        newsletterOptIn: form.newsletterOptIn,
        hasPet: form.hasPet,
        laundryPackages: parseInt(form.laundryPackages, 10),
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

  function handleContinueToExtras() {
    const contactErrors = validateContactForm(form);
    if (contactErrors.length > 0) {
      setError(formatValidationErrors(contactErrors));
      return;
    }
    setStep("extras");
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="mb-4 text-xs text-stone-500">Schritt {step === "travelers" ? "1" : step === "dates" ? "2" : step === "contact" ? "3" : "4"} von 4</div>

      {step === "travelers" && (
        <section className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="font-medium text-stone-700 mb-4">1. Wer reist?</h2>

          <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
            Anzahl Personen *
            <select
              value={form.guests}
              onChange={(e) => update("guests", e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Person" : "Personen"}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700 mb-4">
            <span>
              Haustier mitbringen
              <span className="block text-xs text-stone-500">+10€ pro Nacht</span>
            </span>
            <input
              type="checkbox"
              checked={form.hasPet}
              onChange={(e) => update("hasPet", e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <button
            type="button"
            onClick={() => setStep("dates")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-xl transition-colors"
          >
            Weiter zum Reisezeitraum
          </button>
        </section>
      )}

      {step === "dates" && (
        <section className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="font-medium text-stone-700 mb-4">2. Reisezeitraum</h2>

          <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-medium text-stone-800">Freie Zeiträume im Kalender</h3>
                <p className="text-sm text-stone-600">
                  Freie Tage sind markiert. 1. Klick = Anreise, 2. Klick = Abreise. Ein früheres Datum startet die Auswahl neu.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonths}
                  disabled={visibleMonthStart <= currentMonthStart}
                  aria-label="Vorherige Monate anzeigen"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goToNextMonths}
                  aria-label="Nächste Monate anzeigen"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                >
                  ›
                </button>
                <span className="text-xs font-medium rounded-full bg-white px-3 py-1 text-stone-600 border border-stone-200">
                  {loadingWindows ? "Lade…" : `${availabilityWindows.length} Blöcke`}
                </span>
              </div>
            </div>

            {availabilityWindowsError && (
              <p className="text-sm text-amber-800 mb-3">{availabilityWindowsError}</p>
            )}

            {!loadingWindows && !availabilityWindowsError && availabilityWindows.length === 0 && (
              <p className="text-sm text-stone-500">
                Im aktuellen Horizont sind keine freien Zeiträume sichtbar.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {monthCards.map(({ monthStart, days }) => (
                <div key={toDayKey(monthStart)} className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-stone-800 capitalize">{monthLabel(monthStart)}</h4>
                    <span className="text-[11px] text-stone-500">Klick auf freien Tag</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[11px] text-stone-400 mb-2">
                    {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label) => (
                      <div key={label} className="text-center">
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: ((monthStart.getUTCDay() + 6) % 7) }).map((_, index) => (
                      <div key={`pad-${index}`} />
                    ))}
                    {days.map((day) => {
                      const iso = toDayKey(day);
                      const window = findWindowForDate(day);
                      const isSelectedRange = Boolean(form.checkIn && form.checkOut && iso > form.checkIn && iso < form.checkOut);
                      const isRangeStart = Boolean(form.checkIn && iso === form.checkIn);
                      const isRangeEnd = Boolean(form.checkOut && iso === form.checkOut);
                      const isToday = iso === toDayKey(today);
                      const isAvailable = Boolean(window);
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleCalendarDayClick(day)}
                          title={isAvailable ? `Freier Zeitraum ${formatDateRange(window!.checkIn, window!.checkOut)}` : "Belegt"}
                          className={[
                            "flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                            isAvailable
                              ? isRangeStart || isRangeEnd
                                ? "border-amber-400 bg-amber-400 text-white"
                                : isSelectedRange
                                  ? "border-amber-200 bg-amber-100 text-amber-900"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"
                              : "border-stone-100 bg-stone-100 text-stone-400 cursor-not-allowed",
                            isToday ? "ring-2 ring-amber-300" : "",
                          ].join(" ")}
                        >
                          {day.getUTCDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Anreise *
              <input
                type="text"
                value={form.checkIn ? new Intl.DateTimeFormat("de-DE").format(new Date(form.checkIn)) : "Bitte im Kalender auswählen"}
                readOnly
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 bg-stone-100 cursor-not-allowed"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Abreise *
              <input
                type="text"
                value={form.checkOut ? new Intl.DateTimeFormat("de-DE").format(new Date(form.checkOut)) : "Bitte im Kalender auswählen"}
                readOnly
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 bg-stone-100 cursor-not-allowed"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep("travelers")}
              className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium py-2 rounded-xl transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => setStep("contact")}
              disabled={!form.checkIn || !form.checkOut}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
            >
              Weiter zu Kontaktdaten
            </button>
          </div>
        </section>
      )}

      {step === "contact" && (
        <section className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="font-medium text-stone-700 mb-4">3. Buchungskontakt</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Vorname *
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Nachname *
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <label className="col-span-2 flex flex-col gap-1 text-sm text-stone-600">
              Strasse *
              <input
                type="text"
                value={form.street}
                onChange={(e) => update("street", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              Nr. *
              <input
                type="text"
                value={form.houseNumber}
                onChange={(e) => update("houseNumber", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <label className="flex flex-col gap-1 text-sm text-stone-600">
              PLZ *
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm text-stone-600">
              Ort *
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
            Land *
            <input
              type="text"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
            E-Mail *
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
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

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium py-2 rounded-xl transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={handleContinueToExtras}
              disabled={
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.street ||
                !form.houseNumber ||
                !form.postalCode ||
                !form.city ||
                !form.country
              }
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
            >
              Weiter zu Zusatzoptionen
            </button>
          </div>
        </section>
      )}

      {step === "extras" && (
        <form onSubmit={handleSubmit}>
          <section className="bg-white rounded-2xl shadow p-6 mb-4">
            <h2 className="font-medium text-stone-700 mb-4">4. Zusatzoptionen</h2>

            <label className="flex flex-col gap-1 text-sm text-stone-600 mb-4">
              Wäschepakete
              <select
                value={form.laundryPackages}
                onChange={(e) => update("laundryPackages", e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Paket" : "Pakete"}
                  </option>
                ))}
              </select>
              <span className="text-xs text-stone-500">
                Ein Wäschepaket enthält Handtücher und Bettwäsche für eine Person.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm text-stone-600 mb-2">
              Sonstiges (optional)
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </label>
            <p className="text-xs text-stone-500 mb-4">Weitere Zusatzoptionen können später ergänzt werden.</p>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700 mb-5">
              <input
                type="checkbox"
                checked={form.agbAccepted}
                onChange={(e) => update("agbAccepted", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-500"
              />
              <span>
                Ich habe die <Link href="/agb" target="_blank" className="text-amber-700 hover:underline">AGB</Link> sowie das <Link href="/impressum" target="_blank" className="text-amber-700 hover:underline">Impressum/Disclaimer</Link> gelesen und akzeptiere diese.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700 mb-5">
              <input
                type="checkbox"
                checked={form.newsletterOptIn}
                onChange={(e) => update("newsletterOptIn", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-500"
              />
              <span>
                Ich möchte den Newsletter erhalten und über aktuelle Angebote informiert werden.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium py-2 rounded-xl transition-colors"
              >
                Zurück
              </button>
              <button
                type="submit"
                disabled={loadingSubmit || !form.agbAccepted}
                className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-xl transition-colors"
              >
                {loadingSubmit ? "Anfrage wird gesendet…" : "Anfrage absenden"}
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
