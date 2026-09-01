import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/authentication/change-password-form";
import { getAuthenticationState } from "@/lib/auth";
import { authenticationMessages } from "@/messages/common";

export default async function ChangePasswordPage() {
  const state = await getAuthenticationState();
  if (!state || state.accessDecision === "DENIED") redirect("/login");
  if (state.accessDecision === "PENDING") redirect("/access-pending");
  if (!state.mustChangePassword) redirect("/dashboard");

  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="card-enterprise w-full max-w-md shadow-card"><CardHeader><h1 className="font-display text-xl font-semibold">{authenticationMessages.changePassword.title}</h1><CardDescription>{authenticationMessages.changePassword.description}</CardDescription></CardHeader><CardContent><ChangePasswordForm /></CardContent></Card></main>;
}
