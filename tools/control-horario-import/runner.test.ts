import { describe, expect, it } from "vitest";

import { mapLegacyStatus, mapLegacyTimezone, normalizeImportEmail, validateLegacySource } from "./mapping";
import { runControlHorarioImport } from "./runner";

const source = { users: [], customers: [], scopes: [{ countryCode: "PA", teamName: "Soporte" }], workLogs: [{ id: "legacy-1", userEmail: "ANA@EXAMPLE.COM", status: "completada", startedAt: "2026-08-31T12:00:00.000Z", endedAt: "2026-08-31T13:00:00.000Z", countryCode: "PA", teamName: "Soporte" }] };

describe("Control Horario import", () => {
  it("normalizes identities and legacy states without overtime fields", () => {
    expect(normalizeImportEmail(" ANA@EXAMPLE.COM ")).toBe("ana@example.com");
    expect(mapLegacyStatus("completada")).toBe("COMPLETED");
    expect(mapLegacyTimezone("unknown")).toBe("America/Panama");
  });

  it("reports unmapped scopes and does not mutate on dry-run", async () => {
    const invalid = { ...source, workLogs: [{ ...source.workLogs[0], teamName: "No existe" }] };
    expect(validateLegacySource(invalid)).toContain("workLog:legacy-1:scope");
    const report = await runControlHorarioImport({ mode: "dry-run", source: invalid, prisma: undefined });
    expect(report.mode).toBe("dry-run");
    expect(report.unmapped).toContain("workLog:legacy-1:scope");
  });
});
