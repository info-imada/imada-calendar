import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue({ id: "active-user", email: "ana@combilift.com", name: "Ana Torres" }) }));
vi.mock("@/lib/permissions", () => ({ canAccessPermissionAnywhere: vi.fn().mockResolvedValue(true), requireAdministrationAccess: vi.fn().mockRejectedValue(new Error("FORBIDDEN")) }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

import AppLayout from "@/app/(app)/layout";

describe("authenticated app layout", () => {
  afterEach(cleanup);

  it("owns the persistent shell once for all authenticated routes", async () => {
    const layout = await AppLayout({ children: <p>Contenido de ruta</p> });
    render(layout);

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    expect(screen.getByText("Contenido de ruta")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
  });
});
