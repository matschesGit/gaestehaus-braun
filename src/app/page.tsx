import { fetchApartments } from "@/lib/api-client";
import ApartmentCard from "./components/ApartmentCard";

export default async function HomePage() {
  const apartments = await fetchApartments();

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-stone-800 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-bold mb-3">Willkommen im Gästehaus Braun</h1>
        <p className="text-stone-300 text-lg max-w-xl mx-auto">
          Erholen Sie sich in unseren gemütlichen Ferienwohnungen – mitten in der Natur.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-semibold text-stone-800 mb-8">Unsere Unterkünfte</h2>
        {apartments.length === 0 ? (
          <p className="text-stone-400">Derzeit keine Unterkünfte verfügbar.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {apartments.map((apt) => (
              <ApartmentCard key={apt.id} apt={apt} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border-t border-stone-200 py-12 px-4 text-center">
        <p className="text-stone-600">
          Fragen? Schreiben Sie uns unter{" "}
          <a href="mailto:info@gaestehaus-braun.de" className="text-amber-600 hover:underline">
            info@gaestehaus-braun.de
          </a>
        </p>
      </section>
    </main>
  );
}
