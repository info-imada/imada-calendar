import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { WorkLogPresentation } from "@/features/work-logs/work-log-types";
import { formatWorkLogDateTime } from "@/lib/work-logs/time";

type PdfAttachment = { originalName: string; mimeType: string; bytes?: Uint8Array; url?: string };

function drawWrapped(page: ReturnType<PDFDocument["addPage"]>, text: string, x: number, y: number, width: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, 10) > width && line) {
      page.drawText(line, { x, y: currentY, size: 10, font, color: rgb(0.15, 0.18, 0.25) });
      currentY -= 14;
      line = word;
    } else line = candidate;
  }
  if (line) page.drawText(line, { x, y: currentY, size: 10, font, color: rgb(0.15, 0.18, 0.25) });
  return currentY - 18;
}

export async function buildWorkLogPdf(workLog: WorkLogPresentation, attachments: PdfAttachment[] = []): Promise<Uint8Array> {
  if (workLog.status !== "COMPLETED") throw new Error("PDF_REQUIRES_COMPLETED_WORK_LOG");
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([612, 792]);
  const { height } = page.getSize();
  let y = height - 52;
  page.drawText("Calendar · Registro de tarea", { x: 42, y, size: 18, font: bold, color: rgb(0.1, 0.16, 0.28) });
  y -= 34;
  page.drawText(workLog.customer?.name ?? "Trabajo sin cliente", { x: 42, y, size: 15, font: bold });
  y -= 28;
  const details = [
    ["Técnico", workLog.technician.name ?? workLog.technician.email ?? ""],
    ["Estado", "Completada"],
    ["Fecha", workLog.workDate],
    ["Inicio", formatWorkLogDateTime(workLog.startedAt, workLog.timezone)],
    ["Fin", workLog.endedAt ? formatWorkLogDateTime(workLog.endedAt, workLog.timezone) : ""],
    ["Duración", workLog.durationMinutes === null ? "" : `${workLog.durationMinutes} min`],
    ["Ubicación", workLog.customerLocation?.name ?? workLog.location ?? ""],
    ["Modelo o serie", workLog.machineReference ?? ""],
    ["Zona horaria", workLog.timezone],
  ];
  for (const [label, value] of details) {
    page.drawText(`${label}:`, { x: 42, y, size: 10, font: bold, color: rgb(0.35, 0.4, 0.5) });
    page.drawText(value, { x: 150, y, size: 10, font: regular });
    y -= 17;
  }
  y -= 8;
  page.drawText("Descripción", { x: 42, y, size: 12, font: bold });
  y -= 18;
  y = drawWrapped(page, workLog.description ?? "Sin descripción", workLog.description ? 42 : 42, y, 528, regular);
  if (attachments.length) {
    page.drawText("Adjuntos", { x: 42, y, size: 12, font: bold });
    y -= 18;
    for (const attachment of attachments) {
      if (attachment.bytes && attachment.mimeType === "image/jpeg") {
        const image = await document.embedJpg(attachment.bytes);
        const scale = Math.min(220 / image.width, 130 / image.height, 1);
        page.drawImage(image, { x: 42, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
        y -= image.height * scale + 16;
      } else if (attachment.bytes && attachment.mimeType === "image/png") {
        const image = await document.embedPng(attachment.bytes);
        const scale = Math.min(220 / image.width, 130 / image.height, 1);
        page.drawImage(image, { x: 42, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
        y -= image.height * scale + 16;
      } else {
        y = drawWrapped(page, `${attachment.originalName}${attachment.url ? ` · ${attachment.url}` : " · no disponible"}`, 42, y, 528, regular);
      }
      if (y < 60) break;
    }
  }
  return document.save();
}
