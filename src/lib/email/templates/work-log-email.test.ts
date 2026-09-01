import { describe, expect, it } from "vitest";

import { buildWorkLogEmail } from "@/lib/email/templates/work-log-email";

describe("work log email", () => {
  it("includes local times, state and a safe detail link", () => {
    const content = buildWorkLogEmail({
      kind: "WORK_LOG_COMPLETED",
      workLog: {
        id: "log-1", technician: "Ana", country: "Panamá", team: "Soporte", customer: "IMADA", location: "FINCA", reference: "IMADA-123", workDate: "2026-08-31", timezone: "America/Panama", startedAt: "2026-08-31T06:30:00.000Z", endedAt: "2026-08-31T07:30:00.000Z", durationMinutes: 60, status: "COMPLETED", description: "Revisión <segura>",
      },
    }, "https://calendar.example.com");
    expect(content.subject).toContain("Registro de tarea completado");
    expect(content.text).toContain("1:30 a. m.");
    expect(content.html).toContain("/work-logs/log-1");
    expect(content.html).toContain("Revisión &lt;segura&gt;");
  });
});
