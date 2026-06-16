"use client";

import { useState } from "react";

type ChangePasswordResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Neues Passwort und Wiederholung stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as ChangePasswordResponse;
      if (!res.ok) {
        setError(data.error ?? "Passwort konnte nicht geändert werden.");
        return;
      }

      setSuccess(data.message ?? "Passwort wurde erfolgreich geändert.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Serverfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">Passwort ändern</h1>
      <p className="text-stone-500 text-sm mb-6">Ändere dein Admin-Passwort direkt im Dashboard.</p>

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

      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow p-5 space-y-4">
        <label className="block text-sm text-stone-600">
          Aktuelles Passwort
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block text-sm text-stone-600">
          Neues Passwort
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block text-sm text-stone-600">
          Neues Passwort wiederholen
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-colors"
        >
          {loading ? "Speichere…" : "Passwort aktualisieren"}
        </button>
      </form>
    </div>
  );
}