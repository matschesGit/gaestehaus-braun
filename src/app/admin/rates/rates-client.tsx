"use client";

import type { BookingPricingConfig } from "@/lib/types";
import { useMemo, useState } from "react";

type Apartment = { id: string; title: string };
type Rate = {
  id: string;
  apartmentId: string;
  apartmentTitle: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyPriceCents: number;
  minNights: number;
  isActive: boolean;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function RatesClient({
  apartments,
  initialRates,
  initialPricingConfig,
}: {
  apartments: Apartment[];
  initialRates: Rate[];
  initialPricingConfig: BookingPricingConfig;
}) {
  const [rates, setRates] = useState(initialRates);
  const [pricingConfig, setPricingConfig] = useState(initialPricingConfig);
  const [configDraft, setConfigDraft] = useState({
    extraGuestPerNightEuro: ((initialPricingConfig.extraGuestPerNightCents ?? 0) / 100).toFixed(2),
    petFeePerNightEuro: ((initialPricingConfig.petFeePerNightCents ?? 0) / 100).toFixed(2),
    laundryPackageFeeEuro: ((initialPricingConfig.laundryPackageFeeCents ?? 0) / 100).toFixed(2),
    touristTaxPerPersonPerNightEuro: ((initialPricingConfig.touristTaxPerPersonPerNightCents ?? 0) / 100).toFixed(2),
    cleaningFeeEuro: ((initialPricingConfig.cleaningFeeCents ?? 0) / 100).toFixed(2),
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    nightlyPriceEuro: string;
    minNights: string;
    isActive: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    apartmentId: apartments[0]?.id ?? "",
    name: "",
    startDate: "",
    endDate: "",
    nightlyPriceEuro: "",
    minNights: "1",
  });

  const grouped = useMemo(() => {
    return [...rates].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [rates]);

  async function savePricingConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/booking-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraGuestPerNightCents: Math.round(Number(configDraft.extraGuestPerNightEuro || "0") * 100),
          petFeePerNightCents: Math.round(Number(configDraft.petFeePerNightEuro || "0") * 100),
          laundryPackageFeeCents: Math.round(Number(configDraft.laundryPackageFeeEuro || "0") * 100),
          touristTaxPerPersonPerNightCents: Math.round(Number(configDraft.touristTaxPerPersonPerNightEuro || "0") * 100),
          cleaningFeeCents: Math.round(Number(configDraft.cleaningFeeEuro || "0") * 100),
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; pricingConfig?: BookingPricingConfig }));
      if (!res.ok) throw new Error(data.error ?? "Preise konnten nicht gespeichert werden.");

      setPricingConfig(data.pricingConfig);
      setConfigDraft({
        extraGuestPerNightEuro: ((data.pricingConfig?.extraGuestPerNightCents ?? 0) / 100).toFixed(2),
        petFeePerNightEuro: ((data.pricingConfig?.petFeePerNightCents ?? 0) / 100).toFixed(2),
        laundryPackageFeeEuro: ((data.pricingConfig?.laundryPackageFeeCents ?? 0) / 100).toFixed(2),
        touristTaxPerPersonPerNightEuro: ((data.pricingConfig?.touristTaxPerPersonPerNightCents ?? 0) / 100).toFixed(2),
        cleaningFeeEuro: ((data.pricingConfig?.cleaningFeeCents ?? 0) / 100).toFixed(2),
      });
      setSuccess("Zusatzpreise wurden gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function createRate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId: form.apartmentId,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          nightlyPriceCents: Math.round(Number(form.nightlyPriceEuro || "0") * 100),
          minNights: Number(form.minNights || "1"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rate konnte nicht erstellt werden.");

      const apartmentTitle = apartments.find((a) => a.id === data.rate.apartmentId)?.title ?? "Unbekannt";
      setRates((prev) => [
        ...prev,
        {
          id: data.rate.id,
          apartmentId: data.rate.apartmentId,
          apartmentTitle,
          name: data.rate.name,
          startDate: data.rate.startDate.slice(0, 10),
          endDate: data.rate.endDate.slice(0, 10),
          nightlyPriceCents: data.rate.nightlyPriceCents,
          minNights: data.rate.minNights,
          isActive: data.rate.isActive,
        },
      ]);
      setForm((prev) => ({ ...prev, name: "", startDate: "", endDate: "", nightlyPriceEuro: "", minNights: "1" }));
      setSuccess("Preisregel erfolgreich erstellt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRate(id: string) {
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/rates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Löschen fehlgeschlagen." }));
      setError(data.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    setRates((prev) => prev.filter((r) => r.id !== id));
    setSuccess("Preisregel gelöscht.");
  }

  function startEdit(rate: Rate) {
    setError(null);
    setSuccess(null);
    setEditingId(rate.id);
    setEditDraft({
      name: rate.name,
      startDate: rate.startDate,
      endDate: rate.endDate,
      nightlyPriceEuro: (rate.nightlyPriceCents / 100).toFixed(2),
      minNights: String(rate.minNights),
      isActive: rate.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          startDate: editDraft.startDate,
          endDate: editDraft.endDate,
          nightlyPriceCents: Math.round(Number(editDraft.nightlyPriceEuro || "0") * 100),
          minNights: Number(editDraft.minNights || "1"),
          isActive: editDraft.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");

      setRates((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                name: data.rate.name,
                startDate: data.rate.startDate.slice(0, 10),
                endDate: data.rate.endDate.slice(0, 10),
                nightlyPriceCents: data.rate.nightlyPriceCents,
                minNights: data.rate.minNights,
                isActive: data.rate.isActive,
              }
            : r,
        ),
      );
      setSuccess("Preisregel aktualisiert.");
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>}

      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Zusatzpreise</h2>
            <p className="text-sm text-stone-500">Diese Werte gelten für die Buchung von zusätzlichen Personen, Haustieren und Wäschepaketen.</p>
          </div>
          <span className="text-xs font-medium rounded-full bg-stone-100 px-3 py-1 text-stone-600">Global</span>
        </div>

        <form onSubmit={savePricingConfig} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Zusätzliche Person pro Nacht
            <input
              type="number"
              step="0.01"
              min="0"
              value={configDraft.extraGuestPerNightEuro}
              onChange={(e) => setConfigDraft((prev) => ({ ...prev, extraGuestPerNightEuro: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Haustier pro Nacht
            <input
              type="number"
              step="0.01"
              min="0"
              value={configDraft.petFeePerNightEuro}
              onChange={(e) => setConfigDraft((prev) => ({ ...prev, petFeePerNightEuro: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Wäschepaket pro Paket
            <input
              type="number"
              step="0.01"
              min="0"
              value={configDraft.laundryPackageFeeEuro}
              onChange={(e) => setConfigDraft((prev) => ({ ...prev, laundryPackageFeeEuro: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Kurtaxe pro Person/Nacht
            <input
              type="number"
              step="0.01"
              min="0"
              value={configDraft.touristTaxPerPersonPerNightEuro}
              onChange={(e) => setConfigDraft((prev) => ({ ...prev, touristTaxPerPersonPerNightEuro: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Endreinigung
            <input
              type="number"
              step="0.01"
              min="0"
              value={configDraft.cleaningFeeEuro}
              onChange={(e) => setConfigDraft((prev) => ({ ...prev, cleaningFeeEuro: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={savingConfig}
            className="self-end bg-stone-800 text-white rounded-lg px-3 py-2 text-sm hover:bg-stone-700 disabled:opacity-50"
          >
            {savingConfig ? "Speichere…" : "Zusatzpreise speichern"}
          </button>
        </form>

        <p className="text-xs text-stone-500">
          Aktuell: {formatMoney(pricingConfig.extraGuestPerNightCents ?? 0)} pro zusätzlicher Person und Nacht, {formatMoney(pricingConfig.petFeePerNightCents ?? 0)} pro Haustier und Nacht, {formatMoney(pricingConfig.laundryPackageFeeCents ?? 0)} pro Wäschepaket, {formatMoney(pricingConfig.touristTaxPerPersonPerNightCents ?? 0)} Kurtaxe pro Person und Nacht, {formatMoney(pricingConfig.cleaningFeeCents ?? 0)} Endreinigung.
        </p>
      </section>

      <form onSubmit={createRate} className="bg-white rounded-2xl shadow p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select className="border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.apartmentId} onChange={(e) => setForm((p) => ({ ...p, apartmentId: e.target.value }))}>
          {apartments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Name (z.B. Hauptsaison)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" type="number" step="0.01" min="0" placeholder="Preis / Nacht (EUR)" value={form.nightlyPriceEuro} onChange={(e) => setForm((p) => ({ ...p, nightlyPriceEuro: e.target.value }))} required />
        <button disabled={submitting} className="bg-stone-800 text-white rounded-lg px-3 py-2 text-sm hover:bg-stone-700 disabled:opacity-50">{submitting ? "Speichern…" : "Preis anlegen"}</button>
      </form>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
              <th className="px-5 py-3 font-medium">Unterkunft</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Zeitraum</th>
              <th className="px-5 py-3 font-medium">Preis</th>
              <th className="px-5 py-3 font-medium">Min. Nächte</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((r) => (
              <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-5 py-3 text-stone-700">{r.apartmentTitle}</td>
                <td className="px-5 py-3 text-stone-600">
                  {editingId === r.id ? (
                    <input
                      className="border border-stone-300 rounded px-2 py-1 text-xs w-full"
                      value={editDraft?.name ?? ""}
                      onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    />
                  ) : (
                    r.name
                  )}
                </td>
                <td className="px-5 py-3 text-stone-500">
                  {editingId === r.id ? (
                    <div className="flex gap-2">
                      <input
                        className="border border-stone-300 rounded px-2 py-1 text-xs"
                        type="date"
                        value={editDraft?.startDate ?? ""}
                        onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, startDate: e.target.value } : prev))}
                      />
                      <input
                        className="border border-stone-300 rounded px-2 py-1 text-xs"
                        type="date"
                        value={editDraft?.endDate ?? ""}
                        onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, endDate: e.target.value } : prev))}
                      />
                    </div>
                  ) : (
                    `${new Date(r.startDate).toLocaleDateString("de-DE")} - ${new Date(r.endDate).toLocaleDateString("de-DE")}`
                  )}
                </td>
                <td className="px-5 py-3 text-stone-600">
                  {editingId === r.id ? (
                    <input
                      className="border border-stone-300 rounded px-2 py-1 text-xs w-28"
                      type="number"
                      step="0.01"
                      value={editDraft?.nightlyPriceEuro ?? ""}
                      onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, nightlyPriceEuro: e.target.value } : prev))}
                    />
                  ) : (
                    formatMoney(r.nightlyPriceCents)
                  )}
                </td>
                <td className="px-5 py-3 text-stone-500">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="border border-stone-300 rounded px-2 py-1 text-xs w-16"
                        type="number"
                        min="1"
                        value={editDraft?.minNights ?? "1"}
                        onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, minNights: e.target.value } : prev))}
                      />
                      <label className="text-xs text-stone-500 inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editDraft?.isActive ?? true}
                          onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))}
                        />
                        Aktiv
                      </label>
                    </div>
                  ) : (
                    r.minNights
                  )}
                </td>
                <td className="px-5 py-3">
                  {editingId === r.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(r.id)}
                        disabled={submitting}
                        className="text-green-700 hover:underline text-xs disabled:opacity-50"
                      >
                        Speichern
                      </button>
                      <button onClick={cancelEdit} className="text-stone-600 hover:underline text-xs">Abbrechen</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="text-amber-700 hover:underline text-xs">Bearbeiten</button>
                      <button onClick={() => removeRate(r.id)} className="text-red-600 hover:underline text-xs">Löschen</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-stone-400">Noch keine Preisregeln vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
