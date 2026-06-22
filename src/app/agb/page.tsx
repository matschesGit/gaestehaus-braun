import Link from "next/link";

export default function AgbPage() {
  return (
    <main className="flex-1 bg-gradient-to-br from-[#f4efe7] via-[#ede5d9] to-[#e8dcc8] py-12">
      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl border border-[#d8c8b4] bg-white/90 p-8 sm:p-10 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2f241d] mb-6">AGB</h1>
          <p className="text-[#5a483c] mb-8">
            Allgemeine Geschäftsbedingungen für Buchungsanfragen und Aufenthalte im Gästehaus Braun.
          </p>

          <div className="space-y-7 text-[#5a483c] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">1. Geltungsbereich</h2>
              <p>
                Diese AGB gelten für alle Buchungsanfragen und Buchungen von Ferienwohnungen im Gästehaus Braun,
                die über diese Website eingereicht werden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">2. Buchungsanfrage und Vertragsschluss</h2>
              <p>
                Mit dem Absenden des Buchungsformulars wird eine verbindliche Anfrage übermittelt.
                Der Beherbergungsvertrag kommt mit unserer ausdrücklichen Annahme/Bestätigung zustande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">3. Preise und Leistungen</h2>
              <p>
                Es gelten die im Buchungsprozess sowie in der Rechnung ausgewiesenen Preise.
                Zusatzleistungen (z. B. Haustier, Wäschepakete, weitere Optionen) werden gemäß Auswahl berechnet.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">4. Zahlungsmodalitäten</h2>
              <p>
                Nach Annahme der Buchung erhalten Sie eine Rechnung mit Fälligkeiten.
                Die Zahlung erfolgt in zwei Schritten:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>25 % Anzahlung, fällig innerhalb von 14 Tagen nach Rechnungsdatum.</li>
                <li>75 % Restzahlung, fällig spätestens 21 Tage vor Anreise.</li>
              </ul>
              <p className="mt-2">
                Liegt die Anreise kurzfristiger, können Fälligkeiten entsprechend vorgezogen werden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">5. Stornierung durch Gäste</h2>
              <p>
                Stornierungen müssen in Textform erfolgen. Es gelten die in der Buchungsbestätigung
                bzw. Rechnung benannten Stornierungsbedingungen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">6. An- und Abreise</h2>
              <p>
                Die vereinbarten An- und Abreisedaten sind verbindlich. Abweichungen sind vorab mit uns abzustimmen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">7. Haftung</h2>
              <p>
                Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit.
                Im Übrigen ist die Haftung auf vorhersehbare, vertragstypische Schäden begrenzt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">8. Schlussbestimmungen</h2>
              <p>
                Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
              </p>
            </section>

            <p className="text-sm text-[#7a6658]">
              Hinweis: Diese AGB stellen eine praxisnahe Vorlage dar und sollten für den finalen Einsatz rechtlich geprüft werden.
            </p>

            <p>
              <Link href="/impressum" className="text-[#1f6f61] hover:underline">
                Zum Impressum und Disclaimer
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}