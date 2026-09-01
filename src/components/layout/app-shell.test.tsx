import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

const mockUsePathname = vi.fn(() => "/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

const user = { email: "ana@combilift.com", name: "Ana Torres" };

describe("AppShell", () => {
  beforeEach(() => mockUsePathname.mockReturnValue("/dashboard"));
  afterEach(() => cleanup());

  it("uses the ShadCN sidebar contract and marks the current route", () => {
    render(<AppShell canAccessAdministration={false} canAccessTeam user={user}><p>Contenido operativo</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "Agenda" }).every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByText("Contenido operativo")).toBeVisible();
    expect(screen.getAllByText("Ana Torres")).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Abrir notificaciones" })).not.toBeInTheDocument();
    expect(screen.queryByText("Equipo disponible")).not.toBeInTheDocument();
  });

  it("keeps management routes in the same navigation hierarchy", () => {
    mockUsePathname.mockReturnValue("/settings");
    render(<AppShell canAccessAdministration canAccessTeam user={user}><p>Administración</p></AppShell>);

    expect(screen.getByRole("link", { name: "Administración" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  });

  it("hides administration without effective access and removes the duplicate Activities route", () => {
    render(<AppShell canAccessAdministration={false} canAccessTeam user={user}><p>Agenda</p></AppShell>);

    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Actividades" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Agenda" })).not.toHaveLength(0);
  });

  it("provides the primary destinations in a mobile navigation landmark", () => {
    render(<AppShell canAccessAdministration canAccessTeam user={user}><p>Agenda</p></AppShell>);

    const mobileNavigation = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(mobileNavigation).toHaveTextContent("Agenda");
    expect(mobileNavigation).toHaveTextContent("Calendario");
    expect(mobileNavigation).toHaveTextContent("Equipo");
    expect(mobileNavigation).toHaveTextContent("Más");
  });

  it("hides Team when effective permissions do not allow consultation", () => {
    render(<AppShell canAccessAdministration={false} canAccessTeam={false} user={user}><p>Agenda</p></AppShell>);
    expect(screen.queryByRole("link", { name: "Equipo" })).not.toBeInTheDocument();
  });

  it("keeps the administration shortcut a native link inside the options drawer", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<AppShell canAccessAdministration canAccessTeam user={user}><p>Agenda</p></AppShell>);

    fireEvent.click(screen.getByRole("button", { name: "Más" }));

    expect(screen.getByRole("link", { name: "Administración" })).toHaveAttribute("href", "/settings");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("expected a native <button>"));
    consoleError.mockRestore();
  });
});
