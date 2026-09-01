import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCsrfToken: vi.fn(), signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({
  getCsrfToken: mocks.getCsrfToken,
  signIn: mocks.signIn,
}));

import { LoginForm } from "@/features/authentication/login-form";

describe("LoginForm", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/login");
    mocks.getCsrfToken.mockResolvedValue("test-csrf-token");
  });

  it("prioritizes Zoho and progressively discloses local authentication", () => {
    render(<LoginForm zohoEnabled />);

    expect(screen.getByRole("button", { name: "Continuar con Zoho" })).toBeVisible();
    expect(document.querySelector('img[src*="zoho-svgrepo-com.svg"]')).toBeInTheDocument();
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar cuenta local" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeVisible();
    expect(screen.getByLabelText("Contraseña")).toBeVisible();
    expect(screen.getByPlaceholderText("nombre@empresa.com")).toBeVisible();
    expect(screen.getByPlaceholderText("Ingresa tu contraseña")).toBeVisible();
  });

  it("posts credentials through the CSRF-protected NextAuth callback", async () => {
    render(<LoginForm zohoEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Usar cuenta local" }));

    const submit = screen.getByRole("button", { name: "Iniciar sesión" });
    await waitFor(() => expect(submit).toBeEnabled());
    const form = submit.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/auth/callback/credentials");
    expect(form?.querySelector<HTMLInputElement>('input[name="csrfToken"]')).toHaveValue("test-csrf-token");
    expect(form?.querySelector<HTMLInputElement>('input[name="callbackUrl"]')).toHaveValue("/");
  });

  it("shows an accessible Alert after NextAuth rejects local credentials", async () => {
    window.history.replaceState({}, "", "/login?error=CredentialsSignin");
    render(<LoginForm authenticationError zohoEnabled />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("El correo o la contraseña no son válidos."));
    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert");
  });
});
