import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/actions/authorization", () => ({
  assignUserRole: vi.fn(),
  createManagedUser: vi.fn(),
  deleteUserPermissionOverride: vi.fn(),
  resetTemporaryPassword: vi.fn(),
  revokeUserRole: vi.fn(),
  setManagedUserStatus: vi.fn(),
  setUserPermissionOverride: vi.fn(),
  updateManagedUser: vi.fn(),
}));

import { TeamWorkspace } from "@/features/team/team-workspace";

const members = [
  {
    activities: 3,
    email: "ana@example.com",
    id: "ana",
    name: "Ana Torres",
    nextAbsence: null,
    scope: "Panamá · Soporte técnico",
  },
  {
    activities: 1,
    email: "luis@example.com",
    id: "luis",
    name: "Luis Mora",
    nextAbsence: "18 jul",
    scope: "México · Campo",
  },
];

describe("TeamWorkspace", () => {
  afterEach(cleanup);

  it("uses a surface-free operational toolbar and filters technicians", () => {
    render(<TeamWorkspace members={members} />);

    const toolbar = screen.getByRole("toolbar", {
      name: "Herramientas del equipo",
    });
    expect(toolbar).not.toHaveClass("card-enterprise");

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar personas" }), {
      target: { value: "Ana" },
    });

    expect(screen.getByText("Ana Torres")).toBeVisible();
    expect(screen.queryByText("Luis Mora")).not.toBeInTheDocument();
    expect(screen.getByText("1 persona")).toBeVisible();
    expect(screen.queryByLabelText("Resumen operativo")).not.toBeInTheDocument();
  });

  it("shows status, scoped roles and effective permissions in the user detail", () => {
    render(
      <TeamWorkspace
        model={{
          actorPriority: 500,
          canManageUsers: true,
          countries: [],
          currentUserId: "admin",
          isGlobalAdmin: true,
          members: [
            {
              accessStatus: "ACTIVE",
              activities: 2,
              assignments: [{ countryId: "country-pa", id: "assignment", roleId: "role-tech", roleKey: "TECNICO", roleName: "Técnico", rolePriority: 200, scopeLabel: "Panamá · Soporte técnico", scopeType: "TEAM", teamId: "team-pa" }],
              email: "ana@example.com",
              hasLocalCredential: true,
              id: "ana",
              name: "Ana Torres",
              nextAbsence: null,
              overrides: [],
              permissionScopes: [{ key: "TEAM:team-pa", label: "Panamá · Soporte técnico", permissions: [{ category: "Actividades", key: "activity:read", label: "Consultar actividades", source: "role" }] }],
            },
          ],
          permissions: [],
          roles: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ana Torres/ }));
    expect(screen.getByText("Detalle de usuario")).toBeVisible();
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Sección del usuario" })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Acceso" }));
    expect(screen.getByText("Consultar actividades")).toBeVisible();
  });

  it("exposes create and edit identity flows only to a global administrator", () => {
    render(
      <TeamWorkspace
        model={{
          actorPriority: 500,
          canManageUsers: true,
          countries: [],
          currentUserId: "admin",
          isGlobalAdmin: true,
          members: [{
            accessStatus: "ACTIVE",
            activities: 0,
            assignments: [],
            email: "ana@example.com",
            hasLocalCredential: false,
            hasZohoAccount: true,
            id: "ana",
            name: "Ana Torres",
            nextAbsence: null,
            overrides: [],
            permissionScopes: [],
          }],
          permissions: [],
          roles: [{ id: "role-tech", key: "TECNICO", name: "Técnico", priority: 200 }],
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Nuevo usuario" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Ana Torres/ }));
    expect(screen.getByRole("button", { name: "Editar usuario" })).toBeVisible();
  });

  it("shows the administrator role when a global administrator edits access", async () => {
    render(
      <TeamWorkspace
        model={{
          actorPriority: 500,
          canManageUsers: true,
          countries: [],
          currentUserId: "admin",
          isGlobalAdmin: true,
          members: [{
            accessStatus: "ACTIVE",
            activities: 0,
            assignments: [{ countryId: null, id: "assignment", roleId: "role-tech", roleKey: "TECNICO", roleName: "Técnico", rolePriority: 200, scopeLabel: "Global", scopeType: "GLOBAL", teamId: null }],
            email: "ana@example.com",
            hasLocalCredential: false,
            id: "ana",
            name: "Ana Torres",
            nextAbsence: null,
            overrides: [],
            permissionScopes: [],
          }],
          permissions: [],
          roles: [
            { id: "role-admin", key: "ADMIN", name: "Administrador", priority: 500 },
            { id: "role-tech", key: "TECNICO", name: "Técnico", priority: 200 },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ana Torres/ }));
    fireEvent.click(screen.getByRole("tab", { name: "Configuración" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Rol a asignar" }));

    expect(await screen.findByRole("option", { name: "Administrador" })).toBeVisible();
  });
});
