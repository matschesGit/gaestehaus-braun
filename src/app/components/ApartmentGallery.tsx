"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Photo {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}

interface ApartmentGalleryProps {
  photos: Photo[];
  title: string;
}

function toSmallVariant(url: string) {
  if (url.includes("-lg.")) {
    return url.replace("-lg.", "-sm.");
  }
  return url;
}

export default function ApartmentGallery({ photos, title }: ApartmentGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === null || prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === null || prev === photos.length - 1 ? 0 : prev + 1));
  };

  const sortedPhotos = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentPhoto = selectedIndex !== null ? sortedPhotos[selectedIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sortedPhotos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setSelectedIndex(index)}
            className="relative h-48 group overflow-hidden rounded-lg"
          >
            <Image
              src={toSmallVariant(photo.url)}
              alt={photo.alt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>

            {/* Image */}
            <div className="relative w-full max-w-4xl aspect-video">
              <Image
                src={currentPhoto.url}
                alt={currentPhoto.alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Navigation Arrows */}
            {sortedPhotos.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeftIcon className="w-8 h-8 text-white" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRightIcon className="w-8 h-8 text-white" />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
              {selectedIndex! + 1} / {sortedPhotos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
