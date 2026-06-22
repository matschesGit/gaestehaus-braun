import type { Apartment, AvailabilityResult, AvailabilityWindow, BookingRequestPayload } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function fetchApartments(): Promise<Apartment[]> {
  const res = await fetch(`${BASE_URL}/api/public/apartments`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch apartments");
  const data = await res.json();
  return data.apartments as Apartment[];
}

export async function checkAvailability(
  apartmentId: string,
  checkIn: string,
  checkOut: string,
): Promise<AvailabilityResult> {
  const params = new URLSearchParams({ apartmentId, checkIn, checkOut });
  const res = await fetch(`${BASE_URL}/api/public/availability?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to check availability");
  return res.json();
}

export async function fetchAvailabilityWindows(apartmentId: string): Promise<AvailabilityWindow[]> {
  const params = new URLSearchParams({ apartmentId });
  const res = await fetch(`${BASE_URL}/api/public/availability-windows?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load availability windows");
  const data = (await res.json()) as { windows?: AvailabilityWindow[] };
  return data.windows ?? [];
}

export async function submitBookingRequest(
  payload: BookingRequestPayload,
): Promise<{ booking: { id: string } }> {
  const res = await fetch(`${BASE_URL}/api/public/booking-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      throw new Error(`Bitte korrigieren:\n- ${data.errors.join("\n- ")}`);
    }
    throw new Error(data.error ?? "Failed to submit booking request");
  }
  return data;
}
