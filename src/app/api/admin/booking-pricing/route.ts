import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";
import { DEFAULT_BOOKING_PRICING_CONFIG } from "@/lib/booking-pricing";

async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

function parseCents(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

async function readConfig() {
  const config = await prisma.bookingPricingConfig.findUnique({
    where: { id: DEFAULT_BOOKING_PRICING_CONFIG.id },
  });

  return config ?? DEFAULT_BOOKING_PRICING_CONFIG;
}

export async function GET() {
  try {
    const payload = await ensureAdmin();
    if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

    const pricingConfig = await readConfig();
    return Response.json({ pricingConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await ensureAdmin();
    if (!payload) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

    const body = await request.json();
    const extraGuestPerNightCents = parseCents(body.extraGuestPerNightCents);
    const petFeePerNightCents = parseCents(body.petFeePerNightCents);
    const laundryPackageFeeCents = parseCents(body.laundryPackageFeeCents);
    const touristTaxPerPersonPerNightCents = parseCents(body.touristTaxPerPersonPerNightCents);
    const cleaningFeeCents = parseCents(body.cleaningFeeCents);

    if (
      extraGuestPerNightCents === null ||
      petFeePerNightCents === null ||
      laundryPackageFeeCents === null ||
      touristTaxPerPersonPerNightCents === null ||
      cleaningFeeCents === null
    ) {
      return Response.json({ error: "Ungültige Preisangaben." }, { status: 400 });
    }

    const pricingConfig = await prisma.bookingPricingConfig.upsert({
      where: { id: DEFAULT_BOOKING_PRICING_CONFIG.id },
      update: {
        extraGuestPerNightCents,
        petFeePerNightCents,
        laundryPackageFeeCents,
        touristTaxPerPersonPerNightCents,
        cleaningFeeCents,
      },
      create: {
        id: DEFAULT_BOOKING_PRICING_CONFIG.id,
        extraGuestPerNightCents,
        petFeePerNightCents,
        laundryPackageFeeCents,
        touristTaxPerPersonPerNightCents,
        cleaningFeeCents,
      },
    });

    return Response.json({ pricingConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({ error: message }, { status: 500 });
  }
}
