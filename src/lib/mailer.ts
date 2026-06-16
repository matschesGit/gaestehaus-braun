import nodemailer from "nodemailer";

type BookingInvoiceMailInput = {
  to: string;
  customerName: string;
  apartmentTitle: string;
  invoiceNumber: string;
  bookingId: string;
  invoiceHtml: string;
};

type MailResult = {
  sent: boolean;
  reason?: string;
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
  const config = getMailConfig();
  if (!config) {
    return { sent: false, reason: "SMTP nicht konfiguriert." };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: `Ihre Buchung im Gästehaus Braun - Rechnung ${input.invoiceNumber}`,
    html: `
      <div style="font-family:Arial, Helvetica, sans-serif;line-height:1.6;color:#1c1917;">
        <p>Guten Tag ${input.customerName},</p>
        <p>vielen Dank für Ihre Buchung der Unterkunft <strong>${input.apartmentTitle}</strong>.</p>
        <p>Ihre Buchung wurde angelegt und die Rechnung ${input.invoiceNumber} ist unten sowie im Anhang enthalten.</p>
        <p>Buchungs-ID: <strong>${input.bookingId}</strong></p>
        <div style="margin-top:24px;">${input.invoiceHtml}</div>
      </div>
    `,
    attachments: [
      {
        filename: `${input.invoiceNumber}.html`,
        content: `<!doctype html><html><body>${input.invoiceHtml}</body></html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
  });

  return { sent: true };
}