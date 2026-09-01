import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const auditedFiles = [
  "src/features/authentication/login-form.tsx",
  "src/features/authentication/change-password-form.tsx",
  "src/features/administration/administration-page.tsx",
  "src/features/activities/activity-form-panel.tsx",
  "src/features/activities/activity-detail-panel.tsx",
  "src/features/calendar/calendar-workspace.tsx",
];

describe("ShadCN control audit", () => {
  it("does not render raw interactive controls in completed modules", () => {
    const violations = auditedFiles.flatMap((file) => {
      const source = readFileSync(resolve(file), "utf8");
      return source.match(/<(button|input|select|textarea)\b/g)?.map((match) => `${file}: ${match}`) ?? [];
    });

    expect(violations).toEqual([]);
  });

  it("does not use native date, datetime-local or time inputs", () => {
    const violations = auditedFiles.flatMap((file) => {
      const source = readFileSync(resolve(file), "utf8");
      return source.match(/type=["'](?:date|datetime-local|time)["']/gi)?.map((match) => `${file}: ${match}`) ?? [];
    });

    expect(violations).toEqual([]);
  });
});
