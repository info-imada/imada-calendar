import type { WorkLogStatus } from "@prisma/client";

export const LEGACY_SOURCE = "control-horario";

export type LegacyImportSource = {
  users: { id: string; email: string; name?: string | null }[];
  customers: { id: string; name: string; locations?: { id: string; name: string }[] }[];
  scopes: { countryCode: string; teamName?: string | null }[];
  workLogs: {
    id: string;
    userEmail: string;
    customerId?: string | null;
    locationName?: string | null;
    reference?: string | null;
    description?: string | null;
    status: string;
    startedAt: string;
    endedAt?: string | null;
    durationMinutes?: number | null;
    timezone?: string | null;
    countryCode: string;
    teamName?: string | null;
    attachments?: { id: string; objectKey: string; name: string; mimeType: string; sizeBytes: number }[];
  }[];
};

export function normalizeImportName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function normalizeImportEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function mapLegacyStatus(status: string): WorkLogStatus {
  const normalized = normalizeImportName(status);
  if (["completed", "completada", "finalizada", "complete"].includes(normalized)) return "COMPLETED";
  if (["completion_pending", "finalizacion marcada", "finalización marcada", "pending"].includes(normalized)) return "COMPLETION_PENDING";
  return "IN_PROGRESS";
}

export function mapLegacyTimezone(timezone?: string | null) {
  return timezone === "Europe/Madrid" ? "Europe/Madrid" : "America/Panama";
}

export function scopeKey(countryCode: string, teamName?: string | null) {
  return `${countryCode.trim().toUpperCase()}:${teamName ? normalizeImportName(teamName) : "country"}`;
}

export function validateLegacySource(source: LegacyImportSource) {
  const issues: string[] = [];
  const scopeKeys = new Set(source.scopes.map((scope) => scopeKey(scope.countryCode, scope.teamName)));
  for (const workLog of source.workLogs) {
    if (!scopeKeys.has(scopeKey(workLog.countryCode, workLog.teamName))) issues.push(`workLog:${workLog.id}:scope`);
    if (!normalizeImportEmail(workLog.userEmail)) issues.push(`workLog:${workLog.id}:user`);
    if (workLog.endedAt && new Date(workLog.endedAt) <= new Date(workLog.startedAt)) issues.push(`workLog:${workLog.id}:time`);
  }
  return issues;
}
