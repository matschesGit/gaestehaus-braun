import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;
  apartmentTitle: string;
  customerName: string;
  checkIn: Date;
  checkOut: Date;
  totalAmountCents: number;
  depositAmountCents: number;
  balanceAmountCents: number;
  depositDueDate: Date;
  balanceDueDate: Date;
  currency: string;
  reminderLevel: number;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: Date) {
  return value.toLocaleDateString("de-DE", { timeZone: "UTC" });
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function isFullPaymentShortNotice(data: InvoicePdfData) {
  return data.balanceAmountCents <= 0 && data.depositAmountCents >= data.totalAmountCents;
}

export async function buildInvoicePdf(data: InvoicePdfData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const issuerName = process.env.INVOICE_ISSUER_NAME ?? "Gaestehaus Braun";
  const issuerAddress = process.env.INVOICE_ISSUER_ADDRESS ?? "Adresse bitte ergänzen";
  const issuerEmail = process.env.INVOICE_ISSUER_EMAIL ?? "info@gaestehaus-braun.de";
  const issuerIban = process.env.INVOICE_ISSUER_IBAN ?? "Bankverbindung bitte ergänzen";

  const muted = rgb(0.45, 0.42, 0.4);
  const text = rgb(0.12, 0.11, 0.1);
  const line = rgb(0.9, 0.89, 0.88);
  const card = rgb(0.985, 0.982, 0.975);

  page.drawRectangle({ x: 40, y: 785, width: 515, height: 1, color: line });
  page.drawText("Rechnung", { x: 40, y: 805, size: 24, font: bold, color: text });
  page.drawText(data.invoiceNumber, { x: 40, y: 786, size: 11, font, color: muted });

  page.drawText(issuerName, { x: 350, y: 805, size: 11, font: bold, color: text });
  page.drawText(issuerAddress, { x: 350, y: 789, size: 10, font, color: muted, lineHeight: 13 });
  page.drawText(issuerEmail, { x: 350, y: 752, size: 10, font, color: muted });

  page.drawRectangle({ x: 40, y: 650, width: 250, height: 98, color: card, borderColor: line, borderWidth: 1 });
  page.drawRectangle({ x: 305, y: 650, width: 250, height: 98, color: card, borderColor: line, borderWidth: 1 });

  page.drawText("Rechnung an", { x: 52, y: 730, size: 9, font, color: muted });
  page.drawText(data.customerName, { x: 52, y: 712, size: 11, font: bold, color: text });

  page.drawText("Buchungsdaten", { x: 317, y: 730, size: 9, font, color: muted });
  page.drawText(`Unterkunft: ${data.apartmentTitle}`, { x: 317, y: 712, size: 10, font, color: text });
  page.drawText(`Reisezeitraum: ${formatDate(data.checkIn)} - ${formatDate(data.checkOut)}`, {
    x: 317,
    y: 696,
    size: 10,
    font,
    color: text,
  });
  page.drawText(`Ausgestellt am: ${formatDate(data.issueDate)}`, { x: 317, y: 680, size: 10, font, color: text });

  page.drawRectangle({ x: 40, y: 528, width: 515, height: 104, color: rgb(1, 1, 1), borderColor: line, borderWidth: 1 });
  page.drawText("Betragsübersicht", { x: 52, y: 612, size: 11, font: bold, color: text });
  page.drawText(`Gesamtbetrag: ${formatMoney(data.totalAmountCents, data.currency)}`, {
    x: 52,
    y: 590,
    size: 11,
    font,
    color: text,
  });

  const fullPayment = isFullPaymentShortNotice(data);
  if (fullPayment) {
    page.drawText(`Fälliger Gesamtbetrag: ${formatMoney(data.totalAmountCents, data.currency)}`, {
      x: 52,
      y: 572,
      size: 10,
      font,
      color: text,
    });
  } else {
    page.drawText(`Anzahlung (25%): ${formatMoney(data.depositAmountCents, data.currency)}`, {
      x: 52,
      y: 572,
      size: 10,
      font,
      color: text,
    });
    page.drawText(`Restzahlung: ${formatMoney(data.balanceAmountCents, data.currency)}`, {
      x: 52,
      y: 556,
      size: 10,
      font,
      color: text,
    });
  }
  page.drawText(`Mahnstufe: ${data.reminderLevel}`, { x: 52, y: 540, size: 10, font, color: muted });

  page.drawRectangle({ x: 40, y: 395, width: 515, height: 118, color: rgb(1, 0.97, 0.93), borderColor: rgb(0.98, 0.73, 0.49), borderWidth: 1 });
  page.drawText("Zahlungsziel", { x: 52, y: 490, size: 11, font: bold, color: rgb(0.43, 0.2, 0.08) });

  if (fullPayment) {
    const withinStay = startOfUtcDay(data.issueDate) >= startOfUtcDay(data.checkIn);
    const timingLabel = withinStay
      ? "waehrend des Aufenthalts"
      : "vor Anreise";

    page.drawText(
      `Bitte begleichen Sie den Gesamtbetrag bis spaetestens ${formatDate(data.depositDueDate)}.`,
      { x: 52, y: 470, size: 10, font, color: rgb(0.43, 0.2, 0.08) },
    );
    page.drawText(
      `Aufgrund kurzer Vorlaufzeit ist die vollstaendige Zahlung ${timingLabel} erforderlich.`,
      { x: 52, y: 454, size: 10, font, color: rgb(0.43, 0.2, 0.08) },
    );
  } else {
    page.drawText(
      `Anzahlung bis spaetestens ${formatDate(data.depositDueDate)}.`,
      { x: 52, y: 470, size: 10, font, color: rgb(0.43, 0.2, 0.08) },
    );
    page.drawText(
      `Restbetrag bis spaetestens ${formatDate(data.balanceDueDate)} (3 Wochen vor Anreise).`,
      { x: 52, y: 454, size: 10, font, color: rgb(0.43, 0.2, 0.08) },
    );
  }

  page.drawText(`IBAN: ${issuerIban}`, { x: 52, y: 432, size: 10, font, color: rgb(0.43, 0.2, 0.08) });
  page.drawText(`Erstellt am ${formatDate(data.issueDate)}`, { x: 40, y: 36, size: 9, font, color: muted });

  return pdfDoc.save();
}
