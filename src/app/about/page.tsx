export default function AboutPage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="min-h-[400px] bg-gradient-to-br from-[#f4efe7] via-[#ede5d9] to-[#e8dcc8] flex items-center py-20">
        <div className="max-w-7xl mx-auto px-4 w-full text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-[#2f241d] mb-6">
            Über das <span className="text-[#1f6f61]">Gästehaus Braun</span>
          </h1>
          <p className="text-xl text-[#6f5c4f] max-w-2xl mx-auto">
            Ihre Ferienwohnung in Bad König - ruhig gelegen, zentral angebunden
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="prose prose-lg max-w-none text-[#2f241d]">
            <h2 className="text-3xl font-bold text-[#1f6f61] mb-6">Willkommen bei uns</h2>
            <p className="text-[#6f5c4f] mb-6 leading-relaxed">
              Das Gästehaus Braun steht für entspannte Kur- und Ferienaufenthalte.
              Wir bieten zwei gemütlich eingerichtete Ferienwohnungen mit jeweils
              rund 56 m² - komfortabel, durchdacht und angenehm ruhig.
            </p>

            <h3 className="text-2xl font-bold text-[#2f241d] mt-10 mb-4">Unsere Philosophie</h3>
            <p className="text-[#6f5c4f] mb-6 leading-relaxed">
              Erholung braucht nicht viel - aber das Richtige.
              Deshalb sind unsere Wohnungen vollständig ausgestattet:
              Schlafzimmer, geräumiges Bad, Küche mit Spülmaschine,
              Wohnbereich mit Essplatz, TV, WLAN und großzügigen Terrassen.
            </p>

            <h3 className="text-2xl font-bold text-[#2f241d] mt-10 mb-4">Besonderheiten</h3>
            <ul className="space-y-3 text-[#6f5c4f] mb-6">
              <li className="flex gap-3">
                <span className="text-[#1f6f61] font-bold">✓</span>
                <span>DTV-klassifizierte 4-Sterne-Ferienwohnungen</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#1f6f61] font-bold">✓</span>
                <span>Barrierearme Duschen und modernisierte Bäder</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#1f6f61] font-bold">✓</span>
                <span>Ruhige Lage mit kurzer Distanz zu Wald und Kurzentrum</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#1f6f61] font-bold">✓</span>
                <span>Ca. 300 m zum Bahnhof und wenige Minuten zur Odenwald Therme</span>
              </li>
            </ul>

            <h3 className="text-2xl font-bold text-[#2f241d] mt-10 mb-4">Kontaktieren Sie uns</h3>
            <p className="text-[#6f5c4f] mb-6 leading-relaxed">
              Haben Sie Fragen oder möchten direkt mit uns in Kontakt treten?
              Schreiben Sie uns oder rufen Sie an – wir freuen uns auf Sie!
            </p>
            
            <div className="bg-[#f4efe7] border border-[#d8c8b4] rounded-lg p-6 my-8">
              <p className="text-[#2f241d] mb-2">
                <strong>Email:</strong>{" "}
                <a href="mailto:info@gaestehaus-braun.de" className="text-[#1f6f61] hover:underline">
                  info@gaestehaus-braun.de
                </a>
              </p>
              <p className="text-[#2f241d]">
                <strong>Adresse:</strong>{" "}
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Philipp-Schmunck-Str.+18%2C+64732+Bad+K%C3%B6nig"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1f6f61] hover:underline"
                >
                  Gästehaus Braun, Philipp-Schmunck-Str. 18, 64732 Bad König
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
