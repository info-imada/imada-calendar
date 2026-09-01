import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCountry: vi.fn(),
  createTeam: vi.fn(),
  deleteCustomer: vi.fn(),
  deleteTeam: vi.fn(),
  refresh: vi.fn(),
  setRolePermission: vi.fn(),
  updateTeam: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/app/actions/administration", () => ({
  createCountry: mocks.createCountry,
  createTeam: mocks.createTeam,
  deleteCustomer: mocks.deleteCustomer,
  deleteTeam: mocks.deleteTeam,
  setCustomerStatus: vi.fn(),
  updateCustomer: vi.fn(),
  updateTeam: mocks.updateTeam,
}));
vi.mock("@/app/actions/authorization", () => ({
  createRole: vi.fn(),
  setRolePermission: mocks.setRolePermission,
}));

import { AdministrationPage } from "@/features/administration/administration-page";

describe("AdministrationPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guides an administrator to create the empty operational catalog", () => {
    render(<AdministrationPage model={{ countries: [], roles: [], users: [] }} />);

    expect(screen.getByRole("toolbar", { name: "Herramientas de administración" })).not.toHaveClass("card-enterprise");
    expect(screen.getByText("No hay países configurados")).toBeVisible();
    expect(screen.getByRole("button", { name: "Agregar país" })).toBeVisible();
  });

  it("resets the country form after an asynchronous successful creation", async () => {
    mocks.createCountry.mockResolvedValue({ success: true, countryId: "country-co" });
    render(<AdministrationPage model={{ countries: [], roles: [], users: [] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar país" }));
    const codeInput = screen.getByRole("textbox", { name: "Código" });
    const nameInput = screen.getByRole("textbox", { name: "Nombre" });
    fireEvent.change(codeInput, { target: { value: "CO" } });
    fireEvent.change(nameInput, { target: { value: "Colombia" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(codeInput).toHaveValue(""));
    expect(nameInput).toHaveValue("");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("disables catalog save actions until required fields are complete", () => {
    render(<AdministrationPage model={{ countries: [], roles: [], users: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar país" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("uses the ShadCN Select for a team's country", () => {
    render(<AdministrationPage model={{
      countries: [{ id: "country-pa", code: "PA", name: "Panamá", teams: [] }],
      roles: [],
      users: [],
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar equipo" }));
    expect(screen.getByRole("combobox", { name: "País" })).toHaveAttribute("data-slot", "select-trigger");
  });

  it("groups the role matrix and confirms a permission mutation", async () => {
    mocks.setRolePermission.mockResolvedValue({ success: true });
    render(<AdministrationPage model={{
      actorPriority: 500,
      countries: [],
      permissions: [{ category: "Actividades", id: "cmrl0x4sa001480o3h9q67aab", key: "activity:create", label: "Crear actividades" }],
      roles: [{ id: "cmrl0x4sa001480o3h9q67aaa", isSystem: true, key: "TECNICO", name: "Técnico", permissionIds: [], priority: 200 }],
      users: [],
    }} />);

    fireEvent.click(screen.getByRole("tab", { name: "Roles y permisos" }));
    expect(screen.getAllByText("Actividades").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("checkbox", { name: /Crear actividades.*Técnico/ }));
    expect(screen.getByText("Confirmar cambio de permisos")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Conceder permiso" }));

    await waitFor(() => expect(mocks.setRolePermission).toHaveBeenCalledWith({
      enabled: true,
      permissionId: "cmrl0x4sa001480o3h9q67aab",
      roleId: "cmrl0x4sa001480o3h9q67aaa",
    }));
  });

  it("keeps user management out of administration to avoid a duplicate flow", () => {
    render(<AdministrationPage model={{ countries: [], roles: [], users: [] }} />);
    expect(screen.queryByRole("tab", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Territorios" })).toBeVisible();
  });

  it("exposes team and customer edit/delete actions behind an explicit confirmation", async () => {
    mocks.deleteTeam.mockResolvedValue({ success: true, teamId: "team-pa" });
    mocks.deleteCustomer.mockResolvedValue({ success: true, customerId: "customer-1" });
    render(<AdministrationPage model={{
      countries: [{ id: "country-pa", code: "PA", name: "Panamá", teams: [{ id: "team-pa", name: "Soporte Panamá" }] }],
      customers: [{ id: "customer-1", name: "Cliente Uno", code: "CLI-1", isActive: true }],
      roles: [],
      users: [],
    }} />);

    expect(screen.getByRole("button", { name: "Editar equipo Soporte Panamá" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Soporte Panamá" }));
    expect(screen.getByText("Editar equipo")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar equipo Soporte Panamá" }));
    expect(screen.getByRole("alertdialog", { name: "Eliminar equipo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar equipo" }));

    await waitFor(() => expect(mocks.deleteTeam).toHaveBeenCalledWith({ teamId: "team-pa" }));

    fireEvent.click(screen.getByRole("tab", { name: "Clientes" }));
    expect(screen.getByRole("button", { name: "Editar" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar cliente Cliente Uno" }));
    expect(screen.getByRole("alertdialog", { name: "Eliminar cliente" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar cliente" }));

    await waitFor(() => expect(mocks.deleteCustomer).toHaveBeenCalledWith({ customerId: "customer-1" }));
  });
});
