"use client";

import Link from "next/link";
import { useState } from "react";

type ForgotResponse = {
  ok?: boolean;
  message?: string;
  resetLink?: string;
  error?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setResetLink(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as ForgotResponse;

      if (!res.ok) {
        setError(data.error ?? "Fehler beim Erstellen des Reset-Links.");
        return;
      }

      setMessage(data.message ?? "Wenn die E-Mail existiert, wurde ein Reset-Link erstellt.");
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch {
      setError("Serverfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Passwort vergessen</h1>
        <p className="text-stone-400 text-sm mb-6">Wir erstellen dir einen Reset-Link.</p>

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
            E-Mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors"
          >
            {loading ? "Erstelle Link…" : "Reset-Link erstellen"}
          </button>
        </form>

        {resetLink && (
          <div className="mt-4 text-xs text-stone-500 break-all">
            <p className="font-medium text-stone-700 mb-1">Dev-Reset-Link:</p>
            <a href={resetLink} className="text-amber-700 hover:underline">
              {resetLink}
            </a>
          </div>
        )}

        <div className="mt-4 text-sm">
          <Link href="/admin/login" className="text-amber-700 hover:underline">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </main>
  );
}
