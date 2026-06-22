import nodemailer from "nodemailer";
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";

type BookingInvoiceMailInput = {
  to: string;
  customerName: string;
  apartmentTitle: string;
  invoiceNumber: string;
  bookingId: string;
  invoiceHtml: string;
  invoicePdf: InvoicePdfData;
};

type GenericInvoiceMailInput = {
  to: string;
  customerName: string;
  apartmentTitle: string;
  invoiceNumber: string;
  bookingId: string;
  invoiceHtml: string;
  invoicePdf: InvoicePdfData;
  kind: "invoice" | "reminder";
  reminderLevel?: number;
};

type MailResult = {
  sent: boolean;
  reason?: string;
};

type PaymentConfirmationMailInput = {
  to: string;
  customerName: string;
  invoiceNumber: string;
  apartmentTitle: string;
  paymentType: "deposit" | "balance" | "full";
  amountCents: number;
  currency: string;
};

type CancellationMailInput = {
  to: string;
  customerName: string;
  invoiceNumber: string;
  apartmentTitle: string;
  checkIn: string;
  checkOut: string;
  refundAmountCents: number;
  currency: string;
};

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? process.env.INVOICE_ISSUER_EMAIL ?? "info@gaestehaus-braun.de";

  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    from,
  };
}

export async function sendBookingInvoiceEmail(input: BookingInvoiceMailInput): Promise<MailResult> {
  return sendInvoiceEmail({
    ...input,
    kind: "invoice",
  });
}

export async function sendInvoiceEmail(input: GenericInvoiceMailInput): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) {
    return { sent: false, reason: "SMTP nicht konfiguriert." };
  }

  const subject =
    input.kind === "reminder"
      ? `Zahlungserinnerung ${input.invoiceNumber} (Mahnstufe ${input.reminderLevel ?? 1})`
      : `Ihre Buchung im Gästehaus Braun - Rechnung ${input.invoiceNumber}`;

  const intro =
    input.kind === "reminder"
      ? `<p>Guten Tag ${input.customerName},</p><p>dies ist eine Zahlungserinnerung zu Ihrer Rechnung <strong>${input.invoiceNumber}</strong>.</p>`
      : `<p>Guten Tag ${input.customerName},</p><p>vielen Dank für Ihre Buchung der Unterkunft <strong>${input.apartmentTitle}</strong>.</p><p>Ihre Buchung wurde angelegt und die Rechnung ${input.invoiceNumber} ist unten sowie im Anhang enthalten.</p>`;

  try {
    const pdfBytes = await buildInvoicePdf(input.invoicePdf);
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject,
      html: `
        <div style="font-family:Arial, Helvetica, sans-serif;line-height:1.6;color:#1c1917;">
          ${intro}
          <p>Buchungs-ID: <strong>${input.bookingId}</strong></p>
          <div style="margin-top:24px;">${input.invoiceHtml}</div>
        </div>
      `,
      attachments: [
        {
          filename: `${input.invoiceNumber}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter SMTP-Fehler";
    return { sent: false, reason: `E-Mail-Versand fehlgeschlagen: ${message}` };
  }
}

export async function sendPaymentConfirmationEmail(input: PaymentConfirmationMailInput): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) {
    return { sent: false, reason: "SMTP nicht konfiguriert." };
  }

  const typeLabel = input.paymentType === "deposit" ? "Anzahlung" : input.paymentType === "balance" ? "Restzahlung" : "Vollzahlung";
  const subject = `Zahlungsbestätigung ${input.invoiceNumber} - ${typeLabel}`;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const html = `
      <div style="font-family:Arial, Helvetica, sans-serif;line-height:1.6;color:#1c1917;">
        <p>Guten Tag ${input.customerName},</p>
        <p>wir bestätigen den Geldeingang Ihrer ${typeLabel} in Höhe von <strong>${new Intl.NumberFormat("de-DE", { style: "currency", currency: input.currency }).format(input.amountCents / 100)}</strong> für Ihre Buchung.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#166534;"><strong>Rechnung:</strong> ${input.invoiceNumber}</p>
          <p style="margin:8px 0 0;color:#166534;"><strong>Unterkunft:</strong> ${input.apartmentTitle}</p>
          <p style="margin:8px 0 0;color:#166534;"><strong>Betrag:</strong> ${new Intl.NumberFormat("de-DE", { style: "currency", currency: input.currency }).format(input.amountCents / 100)}</p>
        </div>
        <p>Vielen Dank für Ihren Geldeingang.</p>
        <p style="margin-top:24px;color:#78716c;font-size:12px;">Freundliche Grüße,<br/>Ihr Gästehaus Braun</p>
      </div>
    `;

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject,
      html,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter SMTP-Fehler";
    return { sent: false, reason: `E-Mail-Versand fehlgeschlagen: ${message}` };
  }
}

export async function sendCancellationEmail(input: CancellationMailInput): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) {
    return { sent: false, reason: "SMTP nicht konfiguriert." };
  }

  const subject = `Stornierungsbestätigung - ${input.invoiceNumber}`;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const html = `
      <div style="font-family:Arial, Helvetica, sans-serif;line-height:1.6;color:#1c1917;">
        <p>Guten Tag ${input.customerName},</p>
        <p>wir bestätigen die Stornierung Ihrer Buchung für die Unterkunft <strong>${input.apartmentTitle}</strong>.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#7f1d1d;"><strong>Rechnung:</strong> ${input.invoiceNumber}</p>
          <p style="margin:8px 0 0;color:#7f1d1d;"><strong>Reisezeitraum:</strong> ${new Date(input.checkIn).toLocaleDateString("de-DE")} - ${new Date(input.checkOut).toLocaleDateString("de-DE")}</p>
          <p style="margin:8px 0 0;color:#7f1d1d;"><strong>Rückerstattung:</strong> ${new Intl.NumberFormat("de-DE", { style: "currency", currency: input.currency }).format(input.refundAmountCents / 100)}</p>
        </div>
        <p>Die Rückerstattung wird zeitnah auf Ihr Konto überwiesen.</p>
        <p style="margin-top:24px;color:#78716c;font-size:12px;">Freundliche Grüße,<br/>Ihr Gästehaus Braun</p>
      </div>
    `;

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject,
      html,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter SMTP-Fehler";
    return { sent: false, reason: `E-Mail-Versand fehlgeschlagen: ${message}` };
  }
}