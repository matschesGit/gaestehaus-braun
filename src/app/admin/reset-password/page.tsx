"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type ResetResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Kein Reset-Token vorhanden.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await res.json()) as ResetResponse;

      if (!res.ok) {
        setError(data.error ?? "Passwort konnte nicht geändert werden.");
        return;
      }

      setMessage(data.message ?? "Passwort wurde erfolgreich geändert.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Serverfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Neues Passwort</h1>
        <p className="text-stone-400 text-sm mb-6">Lege dein neues Admin-Passwort fest.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Neues Passwort
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            Passwort wiederholen
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
          >
            {loading ? "Speichere…" : "Passwort ändern"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link href="/admin/login" className="text-amber-700 hover:underline">
            Zum Login
          </Link>
        </div>
      </div>
    </main>
  );
}
