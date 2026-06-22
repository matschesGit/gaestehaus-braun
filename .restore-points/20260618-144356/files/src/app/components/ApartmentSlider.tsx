"use client";

import Image from "next/image";
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

  return (
    <div className="relative w-full h-96 bg-stone-200 rounded-lg overflow-hidden group">
      {/* Images Container */}
      <div className="relative w-full h-full">
        {sortedPhotos.map((photo, index) => (
          <div
            key={`photo-${index}-${photo.sortOrder}`}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 70vw"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {sortedPhotos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition-colors shadow-lg opacity-0 group-hover:opacity-100"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeftIcon className="w-6 h-6 text-[#1f6f61]" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full transition-colors shadow-lg opacity-0 group-hover:opacity-100"
            aria-label="Nächstes Bild"
          >
            <ChevronRightIcon className="w-6 h-6 text-[#1f6f61]" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sortedPhotos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {sortedPhotos.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Bild ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {sortedPhotos.length > 1 && (
        <div className="absolute top-4 right-4 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded">
          {currentIndex + 1} / {sortedPhotos.length}
        </div>
      )}
    </div>
  );
}
