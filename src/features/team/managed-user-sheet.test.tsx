import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManagedUser: vi.fn(),
  updateManagedUser: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/app/actions/authorization", () => ({
  createManagedUser: mocks.createManagedUser,
  updateManagedUser: mocks.updateManagedUser,
}));

import { ManagedUserSheet } from "@/features/team/managed-user-sheet";

const model = {
  actorPriority: 500,
  countries: [
    {
      id: "cmrl0x4sa001480o3h9q67aac",
      name: "Panamá",
      teams: [{ id: "cmrl0x4sa001480o3h9q67aad", name: "Soporte Panamá" }],
    },
  ],
  roles: [
    { id: "cmrl0x4sa001480o3h9q67aaa", key: "TECNICO", name: "Técnico", priority: 200 },
  ],
};

describe("ManagedUserSheet", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("guides a new user through identity, authentication, access and confirmation", async () => {
    const user = userEvent.setup();
    render(
      <ManagedUserSheet
        model={model}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    expect(screen.getByRole("dialog", { name: "Nuevo usuario" })).toBeVisible();
    expect(screen.getByPlaceholderText("Ej. Ana Torres")).toBeVisible();
    expect(screen.getByPlaceholderText("ana.torres@combilift.com")).toBeVisible();
    expect(screen.getByText("Paso 1 de 4")).toBeVisible();
    await user.type(screen.getByLabelText("Nombre completo"), "Ana Torres");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("combobox", { name: "Método de acceso" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("combobox", { name: "Rol inicial" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Alcance inicial" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("combobox", { name: "Estado inicial" })).toBeVisible();
    expect(screen.getByText("Revisa antes de crear")).toBeVisible();
  });

  it("does not advance without identity fields and explains what is missing", async () => {
    const user = userEvent.setup();
    render(<ManagedUserSheet model={model} onOpenChange={vi.fn()} onSaved={vi.fn()} open />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Paso 1 de 4")).toBeVisible();
    expect(screen.getByText("Indica el nombre completo.")).toBeVisible();
    expect(screen.getByText("Indica un correo electrónico válido.")).toBeVisible();
  });

  it("does not create a user when a native submit happens before confirmation", () => {
    render(
      <ManagedUserSheet
        model={model}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    const form = screen.getByRole("button", { name: "Siguiente" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Torres" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    fireEvent.submit(form!);

    expect(screen.getByText("Paso 2 de 4")).toBeVisible();
    expect(mocks.createManagedUser).not.toHaveBeenCalled();
  });

  it("does not create a user on an implicit submit from the confirmation step", () => {
    render(
      <ManagedUserSheet
        model={model}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    const form = screen.getByRole("button", { name: "Siguiente" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Torres" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    expect(screen.getByText("Paso 4 de 4")).toBeVisible();

    fireEvent.submit(form!);
    expect(mocks.createManagedUser).not.toHaveBeenCalled();
  });

  it("lets a global administrator choose the administrator role for a new user", async () => {
    const user = userEvent.setup();
    render(
      <ManagedUserSheet
        model={{
          ...model,
          isGlobalAdmin: true,
          roles: [
            { id: "role-admin", key: "ADMIN", name: "Administrador", priority: 500 },
            { id: "role-tech", key: "TECNICO", name: "Técnico", priority: 200 },
          ],
        }}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Torres" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await user.click(screen.getByRole("combobox", { name: "Rol inicial" }));

    expect(await screen.findByRole("option", { name: "Administrador" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Técnico" })).toBeVisible();
  });

  it("creates a local user and keeps the one-time password visible", async () => {
    const user = userEvent.setup();
    mocks.createManagedUser.mockResolvedValue({
      success: true,
      entityId: "cmrl0x4sa000280o3h9q67aaa",
      temporaryPassword: "Combi-temporal9!",
    });
    render(
      <ManagedUserSheet
        model={model}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Torres" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.com" } });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("combobox", { name: "Método de acceso" }));
    await user.click(await screen.findByRole("option", { name: "Cuenta local" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Método de acceso" })).toHaveTextContent("Cuenta local"));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(mocks.createManagedUser).toHaveBeenCalledWith({
      accessStatus: "ACTIVE",
      authMethod: "LOCAL",
      email: "ana@example.com",
      name: "Ana Torres",
      roleId: "cmrl0x4sa001480o3h9q67aaa",
      scopeType: "GLOBAL",
    }));
    expect(await screen.findByText("Combi-temporal9!")).toBeVisible();
    expect(screen.getByText("Guárdala ahora")).toBeVisible();
  });

  it("keeps the email immutable for a Zoho-linked identity", () => {
    render(
      <ManagedUserSheet
        member={{
          email: "ana@example.com",
          hasZohoAccount: true,
          id: "cmrl0x4sa000280o3h9q67aaa",
          name: "Ana Torres",
        }}
        model={model}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    expect(screen.getByRole("dialog", { name: "Editar usuario" })).toBeVisible();
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByText(/vinculado a Zoho/i)).toBeVisible();
  });

  it("allows an administrator to edit the role and scope together with the identity", async () => {
    const user = userEvent.setup();
    mocks.updateManagedUser.mockResolvedValue({ success: true, entityId: "user-1" });
    render(
      <ManagedUserSheet
        member={{
          assignments: [{
            countryId: null,
            id: "assignment-1",
            roleId: "role-tech",
            roleKey: "TECNICO",
            roleName: "Técnico",
            rolePriority: 200,
            scopeType: "GLOBAL",
            teamId: null,
          }],
          email: "ana@example.com",
          hasZohoAccount: false,
          id: "user-1",
          name: "Ana Torres",
        }}
        model={{
          ...model,
          isGlobalAdmin: true,
          roles: [
            { id: "role-admin", key: "ADMIN", name: "Administrador", priority: 500 },
            { id: "role-tech", key: "TECNICO", name: "Técnico", priority: 200 },
          ],
        }}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        open
      />,
    );

    const role = screen.getByRole("combobox", { name: "Rol" });
    await user.click(role);
    expect(await screen.findByRole("option", { name: "Administrador" })).toBeVisible();
    await user.click(screen.getByRole("option", { name: "Administrador" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.updateManagedUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "ana@example.com",
      name: "Ana Torres",
      roleId: "role-admin",
      scopeType: "GLOBAL",
      userId: "user-1",
    })));
  });
});
