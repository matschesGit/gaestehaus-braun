import type { Apartment } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default function ApartmentCard({ apt }: { apt: Apartment }) {
  const cover = apt.photos[0];

  return (
    <article className="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
      <div className="relative h-52 w-full bg-stone-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt ?? apt.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400 text-sm">
            Kein Foto
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <h2 className="text-xl font-semibold text-stone-800">{apt.title}</h2>
        <p className="text-stone-500 text-sm line-clamp-3">{apt.description}</p>

        <ul className="flex gap-4 text-stone-500 text-sm mt-auto">
          <li>🛏 {apt.bedrooms} Schlafzimmer</li>
          <li>🚿 {apt.bathrooms} Bad</li>
          <li>👤 max. {apt.maxGuests} Gäste</li>
        </ul>

        <div className="flex items-center justify-between mt-2">
          <p className="text-stone-700 font-medium">
            ab {formatPrice(apt.basePriceCents, apt.currency)}
            <span className="text-stone-400 font-normal text-sm"> / Nacht</span>
          </p>
          <Link
            href={`/anfrage?apartmentId=${apt.id}&apartment=${encodeURIComponent(apt.title)}`}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Anfragen
          </Link>
        </div>
      </div>
    </article>
  );
}
