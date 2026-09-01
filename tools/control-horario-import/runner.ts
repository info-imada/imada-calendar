import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { PrismaClient } from "@prisma/client";
import { createImportReport, formatImportReport, type ImportReport } from "./report";
import { LEGACY_SOURCE, mapLegacyStatus, mapLegacyTimezone, normalizeImportEmail, scopeKey, validateLegacySource, type LegacyImportSource } from "./mapping";

type ImportOptions = { mode: "dry-run" | "apply"; source: LegacyImportSource; prisma?: PrismaClient };

export async function loadLegacySource(path: string): Promise<LegacyImportSource> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as LegacyImportSource;
}

export async function runControlHorarioImport({ mode, source, prisma }: ImportOptions): Promise<ImportReport> {
  const report = createImportReport(mode);
  report.unmapped.push(...validateLegacySource(source));
  const validIssues = new Set(report.unmapped);
  if (mode === "dry-run") {
    report.skipped = report.unmapped.length;
    report.created = source.workLogs.filter((item) => !validIssues.has(`workLog:${item.id}:scope`) && !validIssues.has(`workLog:${item.id}:time`)).length;
    return report;
  }
  const database = prisma ?? (await import("../../src/lib/prisma")).getPrisma();
  const { buildWorkLogObjectKey, copyR2Object, headR2Object } = await import("../../src/lib/storage/r2");
  if (report.unmapped.length) throw new Error(`IMPORT_UNMAPPED_ROWS\n${formatImportReport(report)}`);

  const countryMap = new Map<string, { id: string; teamId: string | null }>();
  const userMap = new Map<string, string>();
  const customerMap = new Map<string, string>();
  await database.$transaction(async (transaction) => {
    for (const scope of source.scopes) {
      const country = await transaction.country.findUnique({ where: { code: scope.countryCode.trim().toUpperCase() }, select: { id: true } });
      if (!country) { report.unmapped.push(`scope:${scopeKey(scope.countryCode, scope.teamName)}`); continue; }
      let teamId: string | null = null;
      if (scope.teamName) {
        const team = await transaction.team.findFirst({ where: { countryId: country.id, name: { equals: scope.teamName } }, select: { id: true } });
        if (!team) { report.unmapped.push(`scope:${scopeKey(scope.countryCode, scope.teamName)}`); continue; }
        teamId = team.id;
      }
      countryMap.set(scopeKey(scope.countryCode, scope.teamName), { id: country.id, teamId });
    }
    for (const legacyUser of source.users) {
      const email = normalizeImportEmail(legacyUser.email);
      const existing = await transaction.user.findUnique({ where: { email }, select: { id: true } });
      const user = existing
        ? await transaction.user.update({ where: { id: existing.id }, data: { name: legacyUser.name ?? undefined }, select: { id: true } })
        : await transaction.user.create({ data: { email, name: legacyUser.name ?? email, accessStatus: "PENDING" }, select: { id: true } });
      userMap.set(email, user.id);
      if (existing) report.updated++;
      else report.created++;
    }
    for (const legacyCustomer of source.customers) {
      const customer = await transaction.customer.upsert({ where: { legacySource_legacyId: { legacySource: LEGACY_SOURCE, legacyId: legacyCustomer.id } }, update: { name: legacyCustomer.name }, create: { name: legacyCustomer.name, legacySource: LEGACY_SOURCE, legacyId: legacyCustomer.id }, select: { id: true } });
      customerMap.set(legacyCustomer.id, customer.id);
      for (const [sortOrder, location] of (legacyCustomer.locations ?? []).entries()) await transaction.customerLocation.upsert({ where: { legacySource_legacyId: { legacySource: LEGACY_SOURCE, legacyId: location.id } }, update: { name: location.name, sortOrder }, create: { customerId: customer.id, name: location.name, sortOrder, legacySource: LEGACY_SOURCE, legacyId: location.id } });
    }
    for (const legacy of source.workLogs) {
      const userId = userMap.get(normalizeImportEmail(legacy.userEmail));
      const scope = countryMap.get(scopeKey(legacy.countryCode, legacy.teamName));
      const customerId = legacy.customerId ? customerMap.get(legacy.customerId) : null;
      if (!userId || !scope || (legacy.customerId && !customerId)) { report.unmapped.push(`workLog:${legacy.id}:references`); continue; }
      const customerLocation = customerId && legacy.locationName
        ? await transaction.customerLocation.findFirst({ where: { customerId, name: legacy.locationName }, select: { id: true } })
        : null;
      const startedAt = new Date(legacy.startedAt);
      const endedAt = legacy.endedAt ? new Date(legacy.endedAt) : null;
      const imported = await transaction.workLog.upsert({
        where: { legacySource_legacyId: { legacySource: LEGACY_SOURCE, legacyId: legacy.id } },
        update: { userId, countryId: scope.id, teamId: scope.teamId, customerId, customerLocationId: customerLocation?.id ?? null, startedAt, endedAt, durationMinutes: legacy.durationMinutes ?? (endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60_000) : null), status: mapLegacyStatus(legacy.status), timezone: mapLegacyTimezone(legacy.timezone), machineReference: legacy.reference ?? null, location: legacy.locationName ?? null, description: legacy.description ?? null, activeKey: null },
        create: { userId, countryId: scope.id, teamId: scope.teamId, customerId, customerLocationId: customerLocation?.id ?? null, workDate: new Date(`${startedAt.toISOString().slice(0, 10)}T00:00:00.000Z`), startedAt, endedAt, durationMinutes: legacy.durationMinutes ?? (endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60_000) : null), status: mapLegacyStatus(legacy.status), timezone: mapLegacyTimezone(legacy.timezone), machineReference: legacy.reference ?? null, location: legacy.locationName ?? null, description: legacy.description ?? null, activeKey: null, legacySource: LEGACY_SOURCE, legacyId: legacy.id },
        select: { id: true },
      });
      for (const attachment of legacy.attachments ?? []) {
        const destinationKey = buildWorkLogObjectKey(`legacy-${legacy.id}`, attachment.id, attachment.name);
        const metadata = await headR2Object(attachment.objectKey);
        if ((metadata.ContentLength ?? -1) !== attachment.sizeBytes || metadata.ContentType && metadata.ContentType !== attachment.mimeType) { report.conflicts++; continue; }
        await copyR2Object(attachment.objectKey, destinationKey);
        await transaction.workLogAttachment.upsert({ where: { legacySource_legacyId: { legacySource: LEGACY_SOURCE, legacyId: attachment.id } }, update: { objectKey: destinationKey, originalName: attachment.name, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes }, create: { workLogId: imported.id, userId, uploadUuid: attachment.id, objectKey: destinationKey, originalName: attachment.name, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, legacySource: LEGACY_SOURCE, legacyId: attachment.id } });
      }
      report.updated++;
    }
  });
  return report;
}

async function main() {
  const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--dry-run") ? "dry-run" : null;
  const sourcePath = process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length) ?? "tools/control-horario-import/fixtures/source.json";
  if (!mode) throw new Error("Usa --dry-run o --apply.");
  const source = await loadLegacySource(sourcePath);
  const report = await runControlHorarioImport({ mode, source });
  console.log(formatImportReport(report));
}

if (process.argv[1]?.endsWith("runner.ts")) void main();
