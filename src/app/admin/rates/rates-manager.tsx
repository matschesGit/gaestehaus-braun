"use client";

import { useMemo, useState } from "react";

type Apartment = { id: string; title: string };
type RateRow = {
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

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function RatesManager({
  apartments,
  initialRates,
}: {
  apartments: Apartment[];
  initialRates: RateRow[];
}) {
  const [rates, setRates] = useState<RateRow[]>(initialRates);
  const [apartmentId, setApartmentId] = useState(apartments[0]?.id ?? "");
  const [name, setName] = useState("Saisonpreis");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [nightlyPriceCents, setNightlyPriceCents] = useState("12000");
  const [minNights] = useState("2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, RateRow[]>();
    for (const rate of rates) {
      if (!map.has(rate.apartmentTitle)) map.set(rate.apartmentTitle, []);
      map.get(rate.apartmentTitle)!.push(rate);
    }
    return Array.from(map.entries());
  }, [rates]);

  async function createRate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId,
          name,
          startDate,
          endDate,
          nightlyPriceCents: Number(nightlyPriceCents),
          minNights: Number(minNights),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erstellen fehlgeschlagen.");

      const apt = apartments.find((a) => a.id === apartmentId);
      const row: RateRow = {
        id: data.rate.id,
        apartmentId,
        apartmentTitle: apt?.title ?? "Unbekannt",
        name: data.rate.name,
        startDate: data.rate.startDate.slice(0, 10),
        endDate: data.rate.endDate.slice(0, 10),
        nightlyPriceCents: data.rate.nightlyPriceCents,
        minNights: data.rate.minNights,
        isActive: data.rate.isActive,
      };
      setRates((prev) => [...prev, row].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setSuccess("Preis erfolgreich angelegt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRate(rate: RateRow) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/rates/${rate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rate.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aktualisieren fehlgeschlagen.");
      setRates((prev) => prev.map((r) => (r.id === rate.id ? { ...r, isActive: data.rate.isActive } : r)));
      setSuccess("Preisstatus aktualisiert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    }
  }

  async function removeRate(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/rates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Löschen fehlgeschlagen.");
      }
      setRates((prev) => prev.filter((r) => r.id !== id));
      setSuccess("Preis gelöscht.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createRate} className="bg-white rounded-2xl shadow p-5 grid md:grid-cols-6 gap-3">
        <select
          value={apartmentId}
          onChange={(e) => setApartmentId(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          required
        >
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bezeichnung" className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <input type="number" value={nightlyPriceCents} onChange={(e) => setNightlyPriceCents(e.target.value)} placeholder="Preis in Cent" className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <button type="submit" disabled={loading} className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-60">
          {loading ? "Speichere…" : "Preis anlegen"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>}

      <div className="space-y-4">
        {grouped.map(([title, rows]) => (
          <div key={title} className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 font-medium text-stone-700">{title}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Zeitraum</th>
                  <th className="px-5 py-3">Preis/Nacht</th>
                  <th className="px-5 py-3">Mindestnächte</th>
                  <th className="px-5 py-3">Aktiv</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-50">
                    <td className="px-5 py-3">{r.name}</td>
                    <td className="px-5 py-3 text-stone-500">{new Date(r.startDate).toLocaleDateString("de-DE")} – {new Date(r.endDate).toLocaleDateString("de-DE")}</td>
                    <td className="px-5 py-3 text-stone-500">{formatEuro(r.nightlyPriceCents)}</td>
                    <td className="px-5 py-3 text-stone-500">{r.minNights}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleRate(r)} className={`px-2 py-0.5 rounded-full text-xs ${r.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {r.isActive ? "Aktiv" : "Inaktiv"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => removeRate(r.id)} className="text-red-600 hover:underline text-xs">Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
