import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticationState, getCurrentUser } from "@/lib/auth";
import { canAccessPermissionAnywhere, requireAdministrationAccess } from "@/lib/permissions";

export default async function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const authenticationState = await getAuthenticationState();
    if (authenticationState?.accessDecision === "PENDING") redirect("/access-pending");
    redirect("/login");
  }

  const [canAccessAdministration, canAccessTeam, canAccessWorkLogs] = await Promise.all([
    requireAdministrationAccess(user.id).then(() => true).catch(() => false),
    canAccessPermissionAnywhere(user.id, "availability:read"),
    Promise.all([
      canAccessPermissionAnywhere(user.id, "worklog:read"),
      canAccessPermissionAnywhere(user.id, "worklog:create"),
      canAccessPermissionAnywhere(user.id, "worklog:update"),
    ]).then((permissions) => permissions.some(Boolean)),
  ]);

  return (
    <AppShell
      canAccessAdministration={canAccessAdministration}
      canAccessTeam={canAccessTeam}
      canAccessWorkLogs={canAccessWorkLogs}
      user={{ email: user.email, name: user.name }}
    >
      {children}
    </AppShell>
  );
}
