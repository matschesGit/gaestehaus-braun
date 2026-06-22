"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ApartmentSlider from "./components/ApartmentSlider";

interface Photo {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}

interface Apartment {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePriceCents: number;
  currency: string;
  photos: Photo[];
}

export default function HomeClient() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const response = await fetch("/api/public/apartments");
        const data = await response.json();
        setApartments(data.apartments || []);
      } catch (error) {
        console.error("Error fetching apartments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApartments();
  }, []);

  if (loading) {
    return <div className="text-center py-16">Wird geladen…</div>;
  }

  const heroHouseImageUrl =
    "https://www.gaestehaus-braun.de/.cm4all/uproc.php/0/Designvorlage/A1-Haus-Braun-06.JPG";

  return (
    <>
      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-[#f4efe7] via-[#ede5d9] to-[#e8dcc8] flex items-center py-20">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
            <div className="max-w-2xl">
              <p className="text-[#b35b3f] text-sm font-semibold mb-4 uppercase tracking-wider">
                Willkommen im Gästehaus Braun
              </p>
              <h1 className="text-5xl md:text-6xl font-bold text-[#2f241d] mb-6 leading-tight">
                <span className="text-[#1f6f61]">Ankommen.</span> Durchatmen. Bleiben.
              </h1>
              <p className="text-lg text-[#6f5c4f] mb-8 leading-relaxed">
                Ihr Rückzugsort für Kur- und Urlaubstage in Bad König.
                Zwei komfortable Ferienwohnungen mit viel Ruhe,
                kurzen Wegen und einer Atmosphäre zum Abschalten.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#apartments"
                  className="inline-block bg-[#1f6f61] text-white px-8 py-3 rounded hover:bg-[#186b5f] transition-colors font-semibold"
                >
                  Unterkünfte ansehen
                </a>
                <a
                  href="mailto:info@gaestehaus-braun.de"
                  className="inline-block border-2 border-[#1f6f61] text-[#1f6f61] px-8 py-3 rounded hover:bg-[#1f6f61] hover:text-white transition-colors font-semibold"
                >
                  Direkter Kontakt
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#1f6f61]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-[#d8c8b4] shadow-[0_20px_60px_rgba(47,36,29,0.14)] bg-white">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={heroHouseImageUrl}
                    alt="Frontalansicht Gästehaus Braun"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    priority
                  />
                </div>
                <div className="border-t border-[#e3d6c6] bg-white/90 px-5 py-4">
                  <p className="text-sm font-medium text-[#4d3e34]">Das Gästehaus Braun in Bad König</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apartments Section */}
      <section id="apartments" className="bg-gradient-to-b from-[#f4efe7] to-[#ede5d9] py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-[#b35b3f] text-sm font-semibold mb-4 uppercase tracking-wider">
              Umfangreiche Ausstattung
            </p>
            <h2 className="text-4xl font-bold text-[#2f241d] mb-4">
              Unsere Ferienwohnungen
            </h2>
            <p className="text-[#6f5c4f] max-w-2xl mx-auto">
              Ob alleine, geschäftlich, als Paar oder mit Freunden:
              unsere Wohnungen bieten den passenden Rahmen für erholsame Tage.
            </p>
          </div>

          <div className="space-y-20">
            {apartments.map((apartment, index) => (
              <div 
                key={apartment.id} 
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? "lg:grid-cols-2 lg:auto-flow-dense" : ""
                }`}
              >
                {/* Image Slider */}
                <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                  <ApartmentSlider photos={apartment.photos} title={apartment.title} />
                </div>

                {/* Content */}
                <div className={index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}>
                  <h3 className="text-3xl font-bold text-[#2f241d] mb-4">
                    {apartment.title}
                  </h3>

                  {apartment.shortDescription && (
                    <p className="text-[#3f3128] font-medium mb-3">{apartment.shortDescription}</p>
                  )}
                  
                  <p className="text-[#6f5c4f] mb-6 leading-relaxed">
                    {apartment.description}
                  </p>

                  {/* Price and CTA */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
                    <div>
                      <p className="text-[#6f5c4f] text-sm">Preis pro Nacht</p>
                      <p className="text-3xl font-bold text-[#1f6f61]">
                        ab € {(apartment.basePriceCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <Link
                      href={`/anfrage?apartmentId=${apartment.id}&apartment=${apartment.title}`}
                      className="inline-block bg-[#b35b3f] text-white px-8 py-3 rounded hover:bg-[#a54c34] transition-colors font-semibold text-center"
                    >
                      Anfrage stellen
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Footer */}
      <section className="bg-[#2f241d] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Fragen zur Buchung?</h3>
          <p className="text-[#d8c8b4] mb-6 max-w-xl mx-auto">
            Wald, Innenstadt und Odenwald Therme erreichen Sie in wenigen Minuten.
            Schreiben Sie uns gern - wir freuen uns auf Ihre Anfrage.
          </p>
          <a 
            href="mailto:info@gaestehaus-braun.de" 
            className="inline-block bg-[#1f6f61] text-white px-8 py-3 rounded hover:bg-[#186b5f] transition-colors font-semibold"
          >
            info@gaestehaus-braun.de
          </a>
        </div>
      </section>
    </>
  );
}
