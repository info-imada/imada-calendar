import ExcelJS from "exceljs";

import type { WorkLogPresentation } from "@/features/work-logs/work-log-types";

export const workLogExportColumns = [
  "Tipo",
  "Estado",
  "ID",
  "Técnico",
  "Cliente",
  "Ubicación",
  "Modelo o número de serie",
  "Fecha",
  "Inicio",
  "Fin",
  "Duración",
  "Descripción",
  "Adjuntos",
  "Creación",
] as const;

export async function buildWorkLogExcel(items: WorkLogPresentation[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Calendar";
  const worksheet = workbook.addWorksheet("Registro de tarea");
  worksheet.columns = workLogExportColumns.map((header) => ({ header, key: header, width: Math.max(header.length + 2, 16) }));
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF679436" } };
  items.forEach((item) => worksheet.addRow({
    Tipo: "Registro de tarea",
    Estado: item.status,
    ID: item.id,
    Técnico: item.technician.name ?? item.technician.email ?? "",
    Cliente: item.customer?.name ?? "",
    Ubicación: item.customerLocation?.name ?? item.location ?? "",
    "Modelo o número de serie": item.machineReference ?? "",
    Fecha: item.workDate,
    Inicio: item.startedAt,
    Fin: item.endedAt ?? "",
    Duración: item.durationMinutes === null ? "" : `${item.durationMinutes} min`,
    Descripción: item.description ?? "",
    Adjuntos: item.attachments.length,
    Creación: item.createdAt,
  }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
