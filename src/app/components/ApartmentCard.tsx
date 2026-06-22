import type { Apartment } from "@/lib/types";
import Image from "next/image";
import type { ImageLoaderProps } from "next/image";
import Link from "next/link";

function responsiveVariantLoader({ src, width }: ImageLoaderProps) {
  const selected = src.includes("-lg.") && width <= 1000 ? src.replace("-lg.", "-sm.") : src;
  return `${selected}?w=${width}`;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default function ApartmentCard({ apt }: { apt: Apartment }) {
  const cover = apt.photos[0];

  return (
    <article className="frost-card rounded-2xl overflow-hidden flex flex-col">
      <div className="relative h-56 w-full bg-[#e8ddd0]">
        {cover ? (
          <Image
            src={cover.url}
            loader={responsiveVariantLoader}
            alt={cover.alt ?? apt.title}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#806a59] text-sm">
            Kein Foto
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <h2 className="text-xl font-semibold text-[#2f241d]">{apt.title}</h2>
        <p className="text-[#6f5c4f] text-sm line-clamp-3">{apt.description}</p>

        <ul className="flex gap-4 text-[#6f5c4f] text-sm mt-auto">
          <li>🛏 {apt.bedrooms} Schlafzimmer</li>
          <li>🚿 {apt.bathrooms} Bad</li>
          <li>👤 max. {apt.maxGuests} Gäste</li>
        </ul>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[#2f241d] font-semibold">
            ab {formatPrice(apt.basePriceCents, apt.currency)}
            <span className="text-[#866f5f] font-normal text-sm"> / Nacht</span>
          </p>
          <Link
            href={`/anfrage?apartmentId=${apt.id}&apartment=${encodeURIComponent(apt.title)}`}
            className="bg-brand hover:bg-brand-strong text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Anfragen
          </Link>
        </div>
      </div>
    </article>
  );
}
