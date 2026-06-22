export default function ImpressumPage() {
  return (
    <main className="flex-1 bg-gradient-to-br from-[#f4efe7] via-[#ede5d9] to-[#e8dcc8] py-12">
      <section className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl border border-[#d8c8b4] bg-white/90 p-8 sm:p-10 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2f241d] mb-6">Impressum</h1>

          <div className="space-y-6 text-[#5a483c] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">Angaben gemäß § 5 TMG</h2>
              <p>Gästehaus Braun</p>
              <p>Philipp-Schmunck-Str. 18</p>
              <p>64732 Bad König</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">Kontakt</h2>
              <p>Telefon: +49 (0)6063 3311</p>
              <p>
                E-Mail: <a className="text-[#1f6f61] hover:underline" href="mailto:info@gaestehaus-braun.de">info@gaestehaus-braun.de</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">Haftung für Inhalte</h2>
              <p>
                Als Diensteanbieter sind wir gemäß den allgemeinen Gesetzen für eigene Inhalte auf diesen Seiten verantwortlich.
                Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen wir jedoch keine Gewähr.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">Haftung für Links (Disclaimer)</h2>
              <p>
                Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#2f241d] mb-2">Urheberrecht</h2>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.
                Beiträge Dritter sind als solche gekennzeichnet.
              </p>
            </section>

            <p className="text-sm text-[#7a6658]">
              Hinweis: Diese Angaben ersetzen keine individuelle Rechtsberatung. Bitte lassen Sie Impressum und Disclaimer bei Bedarf rechtlich prüfen.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}