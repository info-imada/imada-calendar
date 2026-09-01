export type ImportReport = {
  mode: "dry-run" | "apply";
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
  unmapped: string[];
  errors: string[];
};

export function createImportReport(mode: ImportReport["mode"]): ImportReport {
  return { mode, created: 0, updated: 0, skipped: 0, conflicts: 0, unmapped: [], errors: [] };
}

export function formatImportReport(report: ImportReport) {
  return [
    `Modo: ${report.mode}`,
    `Creados: ${report.created}`,
    `Actualizados: ${report.updated}`,
    `Omitidos: ${report.skipped}`,
    `Conflictos: ${report.conflicts}`,
    `Sin mapeo: ${report.unmapped.length}`,
    `Errores: ${report.errors.length}`,
    ...report.unmapped.map((item) => `  - ${item}`),
    ...report.errors.map((item) => `  ! ${item}`),
  ].join("\n");
}
