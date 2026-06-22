"use client";

import Image from "next/image";
import type { ImageLoaderProps } from "next/image";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface Photo {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}

interface ApartmentSliderProps {
  photos: Photo[];
  title: string;
}

function toSmallVariant(url: string) {
  if (url.includes("-lg.")) {
    return url.replace("-lg.", "-sm.");
  }
  return url;
}

function responsiveVariantLoader({ src, width }: ImageLoaderProps) {
  const selected = src.includes("-lg.") && width <= 1000 ? src.replace("-lg.", "-sm.") : src;
  return `${selected}?w=${width}`;
}

export default function ApartmentSlider({ photos, title }: ApartmentSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sortedPhotos = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);

  if (!sortedPhotos || sortedPhotos.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedPhotos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === sortedPhotos.length - 1 ? 0 : prev + 1));
  };

  const currentPhoto = sortedPhotos[currentIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_13rem] gap-4">
      <div className="relative h-96 rounded-lg overflow-hidden bg-stone-200 group">
        <Image
          key={`main-${currentIndex}`}
          src={currentPhoto.url}
          loader={responsiveVariantLoader}
          alt={currentPhoto.alt || `${title} Bild ${currentIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 75vw"
          priority={currentIndex === 0}
        />

        {sortedPhotos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white p-2 rounded-full transition-colors shadow-lg"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeftIcon className="w-6 h-6 text-[#1f6f61]" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white p-2 rounded-full transition-colors shadow-lg"
              aria-label="Nächstes Bild"
            >
              <ChevronRightIcon className="w-6 h-6 text-[#1f6f61]" />
            </button>
            <div className="absolute top-4 right-4 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded">
              {currentIndex + 1} / {sortedPhotos.length}
            </div>
          </>
        )}
      </div>

      {sortedPhotos.length > 1 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2 lg:auto-rows-[5.5rem]">
          {sortedPhotos.map((photo, index) => (
            <button
              key={`thumb-${index}-${photo.sortOrder}`}
              onClick={() => setCurrentIndex(index)}
              className={[
                "relative h-20 sm:h-24 lg:h-auto lg:min-h-[5.5rem] overflow-hidden rounded-lg border-2 transition-all",
                index === currentIndex
                  ? "border-[#1f6f61] ring-2 ring-[#1f6f61]/30"
                  : "border-transparent hover:border-[#c7b39e]",
              ].join(" ")}
              aria-label={`Bild ${index + 1} anzeigen`}
            >
              <Image
                src={toSmallVariant(photo.url)}
                alt={photo.alt || `${title} Vorschau ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 25vw, 13rem"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
