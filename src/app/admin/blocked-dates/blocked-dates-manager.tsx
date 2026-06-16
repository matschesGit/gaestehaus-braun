"use client";

import { useMemo, useState } from "react";

type Apartment = { id: string; title: string };
type BlockedRow = {
  id: string;
  apartmentId: string;
  apartmentTitle: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

export default function BlockedDatesManager({
  apartments,
  initialBlockedDates,
}: {
  apartments: Apartment[];
  initialBlockedDates: BlockedRow[];
}) {
  const [rows, setRows] = useState<BlockedRow[]>(initialBlockedDates);
  const [apartmentId, setApartmentId] = useState(apartments[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("Eigenbelegung");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, BlockedRow[]>();
    for (const row of rows) {
      if (!map.has(row.apartmentTitle)) map.set(row.apartmentTitle, []);
      map.get(row.apartmentTitle)!.push(row);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function createBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apartmentId, startDate, endDate, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Anlegen fehlgeschlagen.");

      const apt = apartments.find((a) => a.id === apartmentId);
      const item: BlockedRow = {
        id: data.blockedDate.id,
        apartmentId,
        apartmentTitle: apt?.title ?? "Unbekannt",
        startDate: data.blockedDate.startDate.slice(0, 10),
        endDate: data.blockedDate.endDate.slice(0, 10),
        reason: data.blockedDate.reason,
      };
      setRows((prev) => [...prev, item].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setSuccess("Sperrzeit erfolgreich angelegt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function removeBlockedDate(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Löschen fehlgeschlagen.");
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSuccess("Sperrzeit gelöscht.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createBlockedDate} className="bg-white rounded-2xl shadow p-5 grid md:grid-cols-5 gap-3">
        <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required>
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm" required />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Grund" className="border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-stone-800 hover:bg-stone-700 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-60">
          {loading ? "Speichere…" : "Sperrzeit anlegen"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>}

      <div className="space-y-4">
        {grouped.map(([title, items]) => (
          <div key={title} className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 font-medium text-stone-700">{title}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
                  <th className="px-5 py-3">Von</th>
                  <th className="px-5 py-3">Bis</th>
                  <th className="px-5 py-3">Grund</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-50">
                    <td className="px-5 py-3 text-stone-500">{new Date(item.startDate).toLocaleDateString("de-DE")}</td>
                    <td className="px-5 py-3 text-stone-500">{new Date(item.endDate).toLocaleDateString("de-DE")}</td>
                    <td className="px-5 py-3">{item.reason ?? "-"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => removeBlockedDate(item.id)} className="text-red-600 hover:underline text-xs">Löschen</button>
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
