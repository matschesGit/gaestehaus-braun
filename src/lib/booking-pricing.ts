import { prisma } from "@/lib/prisma";
import type { BookingPricingConfig } from "@/lib/types";

export type { BookingPricingConfig };

export const DEFAULT_BOOKING_PRICING_CONFIG: BookingPricingConfig = {
  id: "global",
  extraGuestPerNightCents: 1500,
  petFeePerNightCents: 1000,
  laundryPackageFeeCents: 1000,
  touristTaxPerPersonPerNightCents: 0,
  cleaningFeeCents: 0,
};

export async function getBookingPricingConfig() {
  const config = await prisma.bookingPricingConfig.findUnique({
    where: { id: DEFAULT_BOOKING_PRICING_CONFIG.id },
  });

  return config ?? DEFAULT_BOOKING_PRICING_CONFIG;
}
