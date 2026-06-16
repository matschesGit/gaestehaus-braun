// Zentrale Typen für die öffentliche API
export type ApartmentPhoto = {
  url: string;
  alt: string | null;
};

export type Apartment = {
  id: string;
  title: string;
  slug: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePriceCents: number;
  currency: string;
  photos: ApartmentPhoto[];
};

export type AvailabilityResult = {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  available: boolean;
  reason: string | null;
};

export type BookingRequestPayload = {
  apartmentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes?: string;
};
