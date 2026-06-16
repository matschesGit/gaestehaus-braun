"use client";

import { useSearchParams } from "next/navigation";
import BookingRequestForm from "../components/BookingRequestForm";
import Link from "next/link";

export default function AnfrageClient() {
  const params = useSearchParams();
  const apartmentId = params.get("apartmentId");
  const apartmentTitle = params.get("apartment") ?? "Unterkunft";

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

  return <BookingRequestForm apartmentId={apartmentId} apartmentTitle={apartmentTitle} />;
}
