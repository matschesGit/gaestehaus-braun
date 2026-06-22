import { DEFAULT_BOOKING_PRICING_CONFIG, type BookingPricingConfig } from "@/lib/booking-pricing";

type RateLike = {
  name: string;
  startDate: Date;
  endDate: Date;
  nightlyPriceCents: number;
};

type ApartmentPricingSource = {
  title: string;
  basePriceCents: number;
  currency: string;
  rates: RateLike[];
};

export type BookingExtras = {
  guests: number;
  hasPet: boolean;
  laundryPackages: number;
};

export type InvoiceLineItem = {
  label: string;
  nights: number;
  nightlyPriceCents: number;
  amountCents: number;
  from: Date;
  to: Date;
};

export type BookingPricing = {
  totalAmountCents: number;
  currency: string;
  nights: number;
  lineItems: InvoiceLineItem[];
  extrasAmountCents: number;
};

export type PaymentSchedule = {
  issueDate: Date;
  depositDueDate: Date;
  balanceDueDate: Date;
  totalAmountCents: number;
  depositAmountCents: number;
  balanceAmountCents: number;
  fullPaymentRequired: boolean;
};

type InvoiceHtmlInput = {
  invoiceNumber: string;
  apartmentTitle: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
  booking: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    extraGuests: number;
    hasPet: boolean;
    laundryPackages: number;
    notes: string | null;
  };
  pricingConfig: BookingPricingConfig;
  pricing: BookingPricing;
  schedule: PaymentSchedule;
};

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const next = startOfUtcDay(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("de-DE", { timeZone: "UTC" });
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function countNights(checkIn: Date, checkOut: Date) {
  const start = startOfUtcDay(checkIn).getTime();
  const end = startOfUtcDay(checkOut).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function calculateBookingPrice(
  apartment: ApartmentPricingSource,
  checkIn: Date,
  checkOut: Date,
  extras: BookingExtras,
  pricingConfig: BookingPricingConfig = DEFAULT_BOOKING_PRICING_CONFIG,
): BookingPricing {
  const start = startOfUtcDay(checkIn);
  const end = startOfUtcDay(checkOut);
  const nights = countNights(checkIn, checkOut);
  const nightlyEntries: Array<{ date: Date; label: string; nightlyPriceCents: number }> = [];

  for (let cursor = new Date(start); cursor < end; cursor = addUtcDays(cursor, 1)) {
    const matchingRate = apartment.rates.find((rate) => {
      const rateStart = startOfUtcDay(rate.startDate);
      const rateEnd = startOfUtcDay(rate.endDate);
      return cursor >= rateStart && cursor <= rateEnd;
    });

    nightlyEntries.push({
      date: new Date(cursor),
      label: matchingRate?.name ?? "Standardpreis",
      nightlyPriceCents: matchingRate?.nightlyPriceCents ?? apartment.basePriceCents,
    });
  }

  const lineItems: InvoiceLineItem[] = [];
  for (const nightlyEntry of nightlyEntries) {
    const current = lineItems[lineItems.length - 1];
    if (
      current &&
      current.label === nightlyEntry.label &&
      current.nightlyPriceCents === nightlyEntry.nightlyPriceCents &&
      current.to.getTime() === nightlyEntry.date.getTime()
    ) {
      current.nights += 1;
      current.to = addUtcDays(current.to, 1);
      current.amountCents += nightlyEntry.nightlyPriceCents;
      continue;
    }

    lineItems.push({
      label: nightlyEntry.label,
      nights: 1,
      nightlyPriceCents: nightlyEntry.nightlyPriceCents,
      amountCents: nightlyEntry.nightlyPriceCents,
      from: new Date(nightlyEntry.date),
      to: addUtcDays(nightlyEntry.date, 1),
    });
  }

  const totalAmountCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const extraGuestCount = Math.max(0, extras.guests - 2);
  const extrasAmountCents =
    extraGuestCount * nights * pricingConfig.extraGuestPerNightCents +
    (extras.hasPet ? nights * pricingConfig.petFeePerNightCents : 0) +
    Math.max(0, extras.laundryPackages) * pricingConfig.laundryPackageFeeCents +
    extras.guests * nights * pricingConfig.touristTaxPerPersonPerNightCents +
    pricingConfig.cleaningFeeCents;

  return {
    totalAmountCents: totalAmountCents + extrasAmountCents,
    currency: apartment.currency,
    nights,
    lineItems,
    extrasAmountCents,
  };
}

export function buildPaymentSchedule(totalAmountCents: number, issueDate: Date, checkIn: Date, checkOut: Date): PaymentSchedule {
  const normalizedIssueDate = startOfUtcDay(issueDate);
  const normalizedCheckIn = startOfUtcDay(checkIn);
  const normalizedCheckOut = startOfUtcDay(checkOut);
  let depositDueDate = addUtcDays(normalizedIssueDate, 14);
  let balanceDueDate = addUtcDays(normalizedCheckIn, -21);
  let fullPaymentRequired = false;

  if (balanceDueDate <= normalizedIssueDate || depositDueDate > balanceDueDate) {
    fullPaymentRequired = true;
    const bookingWithinStay = normalizedIssueDate >= normalizedCheckIn && normalizedIssueDate <= normalizedCheckOut;
    const fallbackDueDate = bookingWithinStay ? normalizedCheckOut : normalizedCheckIn;
    const fullPaymentDueDate = fallbackDueDate > normalizedIssueDate ? fallbackDueDate : normalizedIssueDate;
    depositDueDate = fullPaymentDueDate;
    balanceDueDate = fullPaymentDueDate;
  }

  const depositAmountCents = fullPaymentRequired ? totalAmountCents : Math.round(totalAmountCents * 0.25);
  const balanceAmountCents = fullPaymentRequired ? 0 : totalAmountCents - depositAmountCents;

  return {
    issueDate: normalizedIssueDate,
    depositDueDate,
    balanceDueDate,
    totalAmountCents,
    depositAmountCents,
    balanceAmountCents,
    fullPaymentRequired,
  };
}

export function buildInvoiceNumber(issueDate: Date, sequence: number) {
  return `GB-${issueDate.getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
}

export function renderInvoiceHtml(input: InvoiceHtmlInput) {
  const issuerName = process.env.INVOICE_ISSUER_NAME ?? "Gästehaus Braun";
  const issuerAddress = process.env.INVOICE_ISSUER_ADDRESS ?? "Adresse bitte ergänzen";
  const issuerEmail = process.env.INVOICE_ISSUER_EMAIL ?? "info@gaestehaus-braun.de";
  const issuerIban = process.env.INVOICE_ISSUER_IBAN ?? "Bankverbindung bitte ergänzen";

  const rows = input.pricing.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${escapeHtml(item.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${formatDate(item.from)} - ${formatDate(item.to)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;text-align:right;">${item.nights}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;text-align:right;">${formatMoney(item.nightlyPriceCents, input.pricing.currency)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;text-align:right;">${formatMoney(item.amountCents, input.pricing.currency)}</td>
        </tr>
      `,
    )
    .join("");

  const extrasRows = [
    input.booking.extraGuests > 0
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Zusatzpersonen (${input.booking.extraGuests} x ${input.pricing.nights} Nächte)</span><span>${formatMoney(input.booking.extraGuests * input.pricing.nights * input.pricingConfig.extraGuestPerNightCents, input.pricing.currency)}</span></div>`
      : "",
    input.booking.hasPet
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Haustierpauschale (${input.pricing.nights} Nächte)</span><span>${formatMoney(input.pricing.nights * input.pricingConfig.petFeePerNightCents, input.pricing.currency)}</span></div>`
      : "",
    input.booking.laundryPackages > 0
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Wäschepakete (${input.booking.laundryPackages})</span><span>${formatMoney(input.booking.laundryPackages * input.pricingConfig.laundryPackageFeeCents, input.pricing.currency)}</span></div>`
      : "",
    input.pricingConfig.touristTaxPerPersonPerNightCents > 0
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Kurtaxe (${input.booking.guests} x ${input.pricing.nights} Nächte)</span><span>${formatMoney(input.booking.guests * input.pricing.nights * input.pricingConfig.touristTaxPerPersonPerNightCents, input.pricing.currency)}</span></div>`
      : "",
    input.pricingConfig.cleaningFeeCents > 0
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Endreinigung</span><span>${formatMoney(input.pricingConfig.cleaningFeeCents, input.pricing.currency)}</span></div>`
      : "",
  ].join("");

  const paymentTermsHtml = input.schedule.fullPaymentRequired
    ? `
      <p style="margin:0;color:#7c2d12;">Bitte begleichen Sie den Gesamtbetrag in Höhe von <strong>${formatMoney(input.schedule.totalAmountCents, input.pricing.currency)}</strong> bis spätestens <strong>${formatDate(input.schedule.depositDueDate)}</strong>.</p>
      <p style="margin:8px 0 0;color:#7c2d12;">Aufgrund der kurzen Vorlaufzeit ist die vollständige Zahlung vor Anreise oder - bei sehr kurzfristiger Buchung - während des Aufenthalts erforderlich.</p>
    `
    : `
      <p style="margin:0;color:#7c2d12;">Anzahlung in Höhe von 25% bis spätestens ${formatDate(input.schedule.depositDueDate)}.</p>
      <p style="margin:8px 0 0;color:#7c2d12;">Restbetrag bis spätestens ${formatDate(input.schedule.balanceDueDate)}, also 3 Wochen vor Reiseantritt.</p>
    `;

  const notes = input.booking.notes
    ? `<p style="margin:12px 0 0;color:#57534e;"><strong>Nachricht des Gastes:</strong> ${escapeHtml(input.booking.notes)}</p>`
    : "";

  const addressParts = [
    [input.customer.street, input.customer.houseNumber].filter(Boolean).join(" "),
    [input.customer.postalCode, input.customer.city].filter(Boolean).join(" "),
    input.customer.country ?? "",
  ].filter(Boolean);

  const customerAddressHtml =
    addressParts.length > 0
      ? `<p style="margin:0;color:#57534e;">${escapeHtml(addressParts.join(", "))}</p>`
      : "";

  return `
    <section style="font-family:Arial, Helvetica, sans-serif;color:#1c1917;line-height:1.5;max-width:900px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:32px;">
        <div>
          <p style="margin:0;font-size:28px;font-weight:700;">Rechnung</p>
          <p style="margin:4px 0 0;color:#78716c;">${escapeHtml(input.invoiceNumber)}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-weight:600;">${escapeHtml(issuerName)}</p>
          <p style="margin:0;color:#57534e;white-space:pre-line;">${escapeHtml(issuerAddress)}</p>
          <p style="margin:0;color:#57534e;">${escapeHtml(issuerEmail)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-bottom:28px;">
        <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:16px;padding:16px;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#a8a29e;">Rechnung an</p>
          <p style="margin:0;font-weight:600;">${escapeHtml(input.customer.firstName)} ${escapeHtml(input.customer.lastName)}</p>
          ${customerAddressHtml}
          <p style="margin:0;color:#57534e;">${escapeHtml(input.customer.email)}</p>
          <p style="margin:0;color:#57534e;">${escapeHtml(input.customer.phone ?? "-")}</p>
        </div>
        <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:16px;padding:16px;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#a8a29e;">Buchungsdaten</p>
          <p style="margin:0;color:#57534e;">Unterkunft: <strong style="color:#1c1917;">${escapeHtml(input.apartmentTitle)}</strong></p>
          <p style="margin:0;color:#57534e;">Reisezeitraum: <strong style="color:#1c1917;">${formatDate(input.booking.checkIn)} - ${formatDate(input.booking.checkOut)}</strong></p>
          <p style="margin:0;color:#57534e;">Gäste: <strong style="color:#1c1917;">${input.booking.guests}</strong></p>
          <p style="margin:0;color:#57534e;">Zusatzpersonen: <strong style="color:#1c1917;">${input.booking.extraGuests}</strong></p>
          <p style="margin:0;color:#57534e;">Haustier: <strong style="color:#1c1917;">${input.booking.hasPet ? "ja" : "nein"}</strong></p>
          <p style="margin:0;color:#57534e;">Wäschepakete: <strong style="color:#1c1917;">${input.booking.laundryPackages}</strong></p>
          <p style="margin:0;color:#57534e;">Kurtaxe: <strong style="color:#1c1917;">${formatMoney(input.booking.guests * input.pricing.nights * input.pricingConfig.touristTaxPerPersonPerNightCents, input.pricing.currency)}</strong></p>
          <p style="margin:0;color:#57534e;">Endreinigung: <strong style="color:#1c1917;">${formatMoney(input.pricingConfig.cleaningFeeCents, input.pricing.currency)}</strong></p>
          <p style="margin:0;color:#57534e;">Buchungs-ID: <strong style="color:#1c1917;">${escapeHtml(input.booking.id)}</strong></p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f5f5f4;color:#57534e;text-align:left;">
            <th style="padding:10px 12px;">Leistung</th>
            <th style="padding:10px 12px;">Zeitraum</th>
            <th style="padding:10px 12px;text-align:right;">Nächte</th>
            <th style="padding:10px 12px;text-align:right;">Preis/Nacht</th>
            <th style="padding:10px 12px;text-align:right;">Betrag</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
        <div style="width:100%;max-width:360px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:16px;padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span>Gesamtbetrag</span>
            <strong>${formatMoney(input.schedule.totalAmountCents, input.pricing.currency)}</strong>
          </div>
          ${extrasRows}
          ${
            input.schedule.fullPaymentRequired
              ? `<div style="display:flex;justify-content:space-between;color:#57534e;"><span>Fälliger Gesamtbetrag</span><span>${formatMoney(input.schedule.totalAmountCents, input.pricing.currency)}</span></div>`
              : `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#57534e;"><span>Anzahlung 25%</span><span>${formatMoney(input.schedule.depositAmountCents, input.pricing.currency)}</span></div><div style="display:flex;justify-content:space-between;color:#57534e;"><span>Restzahlung</span><span>${formatMoney(input.schedule.balanceAmountCents, input.pricing.currency)}</span></div>`
          }
        </div>
      </div>

      <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:16px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;">Zahlungsziel</p>
        ${paymentTermsHtml}
        <p style="margin:12px 0 0;color:#7c2d12;">IBAN: ${escapeHtml(issuerIban)}</p>
      </div>

      ${notes}

      <p style="margin-top:24px;color:#78716c;font-size:12px;">Erstellt am ${formatDate(input.schedule.issueDate)}.</p>
    </section>
  `;
}