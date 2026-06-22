"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import BookingRequestForm from "../components/BookingRequestForm";
import ApartmentSlider from "../components/ApartmentSlider";
import Link from "next/link";

interface ApartmentData {
  id: string;
  title: string;
  slug: string;
  description: string;
  photos: Array<{
    id: string;
    url: string;
    alt: string;
    sortOrder: number;
  }>;
}

export default function AnfrageClient() {
  const params = useSearchParams();
  const apartmentId = params.get("apartmentId");
  const apartmentTitle = params.get("apartment") ?? "Unterkunft";
  const [apartment, setApartment] = useState<ApartmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apartmentId) {
      setLoading(false);
      return;
    }

    const fetchApartment = async () => {
      try {
        const response = await fetch(`/api/public/apartments?id=${apartmentId}`);
        if (!response.ok) throw new Error("Failed to fetch apartment");
        const data = await response.json();
        setApartment(data);
      } catch (error) {
        console.error("Error fetching apartment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApartment();
  }, [apartmentId]);

  if (!apartmentId) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">Keine Unterkunft ausgewählt.</p>
        <Link href="/" className="text-amber-600 hover:underline">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-400">Wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {apartment && apartment.photos.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#2f241d] mb-6">{apartment.title}</h2>
          <ApartmentSlider photos={apartment.photos} title={apartment.title} />
        </div>
      )}
      <BookingRequestForm apartmentId={apartmentId} apartmentTitle={apartmentTitle} />
    </div>
  );
}
