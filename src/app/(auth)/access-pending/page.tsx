import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getAuthenticationState } from "@/lib/auth";
import { authenticationMessages } from "@/messages/common";
import { SignOutButton } from "@/features/authentication/sign-out-button";

export default async function AccessPendingPage() {
  const state = await getAuthenticationState();
  if (!state || state.accessDecision === "DENIED") redirect("/login");
  if (state.accessDecision === "ACTIVE") {
    if (state.mustChangePassword) redirect("/change-password");
    redirect("/dashboard");
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><h1 className="font-display text-xl font-semibold">{authenticationMessages.pending.title}</h1><CardDescription>{authenticationMessages.pending.description} Cuando tu acceso esté listo, podrás entrar con la misma cuenta.</CardDescription></CardHeader><CardContent><SignOutButton /></CardContent></Card></main>;
}
