// Zentrale Typen für die öffentliche API
export type ApartmentPhoto = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type Apartment = {
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
  photos: ApartmentPhoto[];
};

export type AvailabilityResult = {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  available: boolean;
  reason: string | null;
};

export type AvailabilityWindow = {
  checkIn: string;
  checkOut: string;
};

export type BookingRequestPayload = {
  apartmentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  agbAccepted: boolean;
  newsletterOptIn?: boolean;
  hasPet?: boolean;
  laundryPackages?: number;
  notes?: string;
};

export type BookingPricingConfig = {
  id: string;
  extraGuestPerNightCents: number;
  petFeePerNightCents: number;
  laundryPackageFeeCents: number;
  touristTaxPerPersonPerNightCents: number;
  cleaningFeeCents: number;
};
