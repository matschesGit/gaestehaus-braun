"use client";

import { useMemo, useState } from "react";

type Apartment = { id: string; title: string };
type BlockedDate = {
  id: string;
  apartmentId: string;
  apartmentTitle: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

export default function BlockedDatesClient({ apartments, initialBlocked }: { apartments: Apartment[]; initialBlocked: BlockedDate[] }) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ startDate: string; endDate: string; reason: string } | null>(null);
  const [form, setForm] = useState({
    apartmentId: apartments[0]?.id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const list = useMemo(() => [...blocked].sort((a, b) => a.startDate.localeCompare(b.startDate)), [blocked]);

  async function createBlocked(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sperrzeit konnte nicht erstellt werden.");

      const apartmentTitle = apartments.find((a) => a.id === data.blockedDate.apartmentId)?.title ?? "Unbekannt";
      setBlocked((prev) => [
        ...prev,
        {
          id: data.blockedDate.id,
          apartmentId: data.blockedDate.apartmentId,
          apartmentTitle,
          startDate: data.blockedDate.startDate.slice(0, 10),
          endDate: data.blockedDate.endDate.slice(0, 10),
          reason: data.blockedDate.reason,
        },
      ]);
      setForm((prev) => ({ ...prev, startDate: "", endDate: "", reason: "" }));
      setSuccess("Sperrzeit erfolgreich angelegt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeBlocked(id: string) {
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Löschen fehlgeschlagen." }));
      setError(data.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    setSuccess("Sperrzeit gelöscht.");
  }

  function startEdit(item: BlockedDate) {
    setError(null);
    setSuccess(null);
    setEditingId(item.id);
    setEditDraft({
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason ?? "",
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
      const res = await fetch(`/api/admin/blocked-dates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editDraft.startDate,
          endDate: editDraft.endDate,
          reason: editDraft.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");

      setBlocked((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                startDate: data.blockedDate.startDate.slice(0, 10),
                endDate: data.blockedDate.endDate.slice(0, 10),
                reason: data.blockedDate.reason,
              }
            : item,
        ),
      );
      setSuccess("Sperrzeit aktualisiert.");
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

      <form onSubmit={createBlocked} className="bg-white rounded-2xl shadow p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.apartmentId} onChange={(e) => setForm((p) => ({ ...p, apartmentId: e.target.value }))}>
          {apartments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Grund (optional)" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        <button disabled={submitting} className="md:col-span-4 bg-stone-800 text-white rounded-lg px-3 py-2 text-sm hover:bg-stone-700 disabled:opacity-50">{submitting ? "Speichern…" : "Sperrzeit anlegen"}</button>
      </form>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
              <th className="px-5 py-3 font-medium">Unterkunft</th>
              <th className="px-5 py-3 font-medium">Zeitraum</th>
              <th className="px-5 py-3 font-medium">Grund</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-5 py-3 text-stone-700">{b.apartmentTitle}</td>
                <td className="px-5 py-3 text-stone-500">
                  {editingId === b.id ? (
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
                    `${new Date(b.startDate).toLocaleDateString("de-DE")} - ${new Date(b.endDate).toLocaleDateString("de-DE")}`
                  )}
                </td>
                <td className="px-5 py-3 text-stone-600">
                  {editingId === b.id ? (
                    <input
                      className="border border-stone-300 rounded px-2 py-1 text-xs w-full"
                      value={editDraft?.reason ?? ""}
                      onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
                    />
                  ) : (
                    b.reason || "-"
                  )}
                </td>
                <td className="px-5 py-3">
                  {editingId === b.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(b.id)}
                        disabled={submitting}
                        className="text-green-700 hover:underline text-xs disabled:opacity-50"
                      >
                        Speichern
                      </button>
                      <button onClick={cancelEdit} className="text-stone-600 hover:underline text-xs">Abbrechen</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(b)} className="text-amber-700 hover:underline text-xs">Bearbeiten</button>
                      <button onClick={() => removeBlocked(b.id)} className="text-red-600 hover:underline text-xs">Löschen</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-stone-400">Noch keine Sperrzeiten vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
