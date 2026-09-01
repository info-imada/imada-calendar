import { describe, expect, it } from "vitest";

import { buildAccountEmail } from "@/lib/email/templates/account-email";
import { buildActivityEmail } from "@/lib/email/templates/activity-email";

describe("email templates", () => {
  it("renders a responsive escaped activity email with plain text fallback", () => {
    const content = buildActivityEmail({
      kind: "ACTIVITY_CREATED",
      activity: { id: "act-1", title: "Revisión <urgente>", startsAt: "2026-08-13T12:00:00.000Z", endsAt: "2026-08-13T13:00:00.000Z", allDay: false, country: "Panamá", type: "Visita", status: "Planificada", priority: "Media", assignedToName: "Ana" },
      actorName: "Coordinador",
    }, "https://calendar.example.com");

    expect(content.html).toContain('name="viewport"');
    expect(content.html).toContain('width="680"');
    expect(content.html).toContain("background-color:#679436");
    expect(content.html).toMatch(/background-color:#f5f5f5/i);
    expect(content.html).toContain("color:#424242");
    expect(content.html).toContain("color:#FFFFFF;text-transform:uppercase");
    expect(content.html).toContain('name="color-scheme" content="light dark"');
    expect(content.html).not.toContain("#1d6f50");
    expect(content.html).not.toContain("#26875f");
    expect(content.html).toContain("min-height:44px");
    expect(content.html).toContain("Revisión &lt;urgente&gt;");
    expect(content.text).toContain("https://calendar.example.com/dashboard?activity=act-1");
  });

  it("renders local credentials only when explicitly provided", () => {
    const content = buildAccountEmail({ kind: "USER_WELCOME", user: { id: "u1", email: "ana@example.com", name: "Ana" }, authMethod: "LOCAL", temporaryPassword: "Combi-temporal9!" }, "https://calendar.example.com");
    expect(content.text).toContain("Combi-temporal9!");

    const zoho = buildAccountEmail({ kind: "USER_WELCOME", user: { id: "u2", email: "zoho@example.com", name: "Zoho" }, authMethod: "ZOHO" }, "https://calendar.example.com");
    expect(zoho.text).not.toContain("Contraseña temporal");
    expect(zoho.text).toContain("Continuar con Zoho");
  });
});
