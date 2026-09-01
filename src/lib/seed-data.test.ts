import { describe, expect, it } from "vitest";

import {
  seedAdminUser,
  seedActivityTypes,
  seedCountries,
  seedPermissions,
  seedRolePermissions,
  seedRoles,
  seedTeams,
} from "../../prisma/seed-data";

describe("database seed data", () => {
  it("defines a deterministic LATAM catalog", () => {
    expect(seedCountries.map(({ code }) => code)).toEqual(["PA", "MX", "CR"]);
    expect(seedTeams.every((team) => seedCountries.some((country) => country.code === team.countryCode))).toBe(true);
    expect(seedTeams).toHaveLength(5);
  });

  it("defines an active global administrator principal", () => {
    expect(seedAdminUser).toMatchObject({
      email: "admin.demo@combilift.test",
      accessStatus: "ACTIVE",
      roleKey: "ADMIN",
      scopeType: "GLOBAL",
      passwordEnvironmentVariable: "SEED_ADMIN_PASSWORD",
    });
  });

  it("defines the two ordered system roles and the technician permission matrix", () => {
    expect(seedRoles.map(({ key, priority, isSystem }) => ({ key, priority, isSystem }))).toEqual([
      { key: "ADMIN", priority: 500, isSystem: true },
      { key: "TECNICO", priority: 200, isSystem: true },
    ]);
    expect(seedPermissions).toHaveLength(17);
    expect(new Set(seedPermissions.map(({ category }) => category))).toEqual(
      new Set(["Actividades", "Disponibilidad", "Administración", "Auditoría", "Registro de tarea"]),
    );
    expect(seedRolePermissions.ADMIN).toEqual(
      seedPermissions.map(({ key }) => key),
    );
    expect(seedRolePermissions.TECNICO).toEqual([
      "activity:read",
      "activity:update",
      "activity:comment",
      "availability:read",
      "availability:update",
      "worklog:read",
      "worklog:create",
      "worklog:update",
      "worklog:finish",
      "worklog:complete",
    ]);
    expect(seedActivityTypes.some((item) => item.code === "EQUIPMENT_DELIVERY" && item.name === "Entrega de Equipo")).toBe(true);
  });
});
