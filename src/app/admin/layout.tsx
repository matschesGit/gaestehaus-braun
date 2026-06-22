import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = token ? await verifyAdminToken(token) : null;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className="bg-stone-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm">Gästehaus Braun – Admin</span>
          <nav className="flex gap-4 text-sm">
            {payload ? (
              <>
                <Link href="/admin" className="text-stone-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/bookings" className="text-stone-300 hover:text-white transition-colors">
                  Buchungen
                </Link>
                <Link href="/admin/rates" className="text-stone-300 hover:text-white transition-colors">
                  Preise
                </Link>
                <Link href="/admin/apartments" className="text-stone-300 hover:text-white transition-colors">
                  Apartments
                </Link>
                <Link href="/admin/blocked-dates" className="text-stone-300 hover:text-white transition-colors">
                  Sperrzeiten
                </Link>
                <Link href="/admin/change-password" className="text-stone-300 hover:text-white transition-colors">
                  Passwort ändern
                </Link>
              </>
            ) : (
              <>
                <Link href="/admin/login" className="text-stone-300 hover:text-white transition-colors">
                  Anmelden
                </Link>
                <Link href="/" className="text-stone-300 hover:text-white transition-colors">
                  Zur Startseite
                </Link>
              </>
            )}
          </nav>
        </div>
        {payload ? (
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="text-stone-400 hover:text-white text-sm transition-colors"
            >
              Abmelden
            </button>
          </form>
        ) : (
          <span className="text-stone-400 text-sm">Nicht angemeldet</span>
        )}
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
