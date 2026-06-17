import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type InvoicePdfData = {
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

export async function buildInvoicePdf(data: InvoicePdfData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const line = (label: string, value: string, isBold = false) => {
    page.drawText(label, { x: 50, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value, { x: 220, y, size: 11, font: isBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  };

  page.drawText("Rechnung", { x: 50, y, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 36;

  line("Rechnungsnummer", data.invoiceNumber, true);
  line("Ausgestellt am", formatDate(data.issueDate));
  line("Gast", data.customerName, true);
  line("Unterkunft", data.apartmentTitle);
  line("Reisezeitraum", `${formatDate(data.checkIn)} - ${formatDate(data.checkOut)}`);
  y -= 8;

  line("Gesamtbetrag", formatMoney(data.totalAmountCents, data.currency), true);
  line("Anzahlung", `${formatMoney(data.depositAmountCents, data.currency)} bis ${formatDate(data.depositDueDate)}`);
  line("Restzahlung", `${formatMoney(data.balanceAmountCents, data.currency)} bis ${formatDate(data.balanceDueDate)}`);
  line("Mahnstufe", String(data.reminderLevel));

  y -= 24;
  page.drawText("Hinweis: Dies ist ein automatisch erzeugtes PDF-Exportdokument.", {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  return pdfDoc.save();
}
