"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import {
  CalendarDaysIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/providers/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AppShellUser = {
  email: string | null;
  name: string | null;
};

type AppShellProps = {
  canAccessAdministration: boolean;
  canAccessTeam: boolean;
  canAccessWorkLogs?: boolean;
  children: ReactNode;
  user: AppShellUser;
};

const primaryItems = [
  { href: "/dashboard", icon: LayoutDashboardIcon, label: "Agenda" },
  { href: "/calendar", icon: CalendarDaysIcon, label: "Calendario" },
  { href: "/work-logs", icon: ClipboardCheckIcon, label: "Registro de tarea" },
  { href: "/team", icon: UsersIcon, label: "Equipo" },
] as const;

function initials(user: AppShellUser) {
  const source = user.name?.trim() || user.email?.split("@")[0] || "Usuario";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || (href === "/dashboard" && pathname === "/");
}

function NavigationLink({ compact = false, href, icon: Icon, label, pathname }: {
  compact?: boolean;
  href: string;
  icon: typeof LayoutDashboardIcon;
  label: string;
  pathname: string;
}) {
  const active = isCurrentRoute(pathname, href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
        compact && "flex-col justify-center gap-1 rounded-none px-1 py-1 text-[0.6875rem]",
      )}
      href={href}
      title={label}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className={compact ? undefined : "hidden lg:inline"}>{label}</span>
    </Link>
  );
}

function UserIdentity({ user }: { user: AppShellUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">{initials(user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name || "Usuario"}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function AppShell({ canAccessAdministration, canAccessTeam, canAccessWorkLogs = false, children, user }: AppShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigationItems = primaryItems.filter((item) => item.href !== "/team" || canAccessTeam).filter((item) => item.href !== "/work-logs" || canAccessWorkLogs);
  const desktopItems = canAccessAdministration
    ? [...navigationItems, { href: "/settings", icon: SettingsIcon, label: "Administración" } as const]
    : navigationItems;

  return (
    <TooltipProvider>
      <div className="flex min-h-svh min-w-0 bg-background">
        <aside className="sticky top-0 hidden h-svh w-20 shrink-0 flex-col border-r border-border bg-card px-2 py-3 md:flex lg:w-60 lg:px-3">
          <Link aria-label="Ir a la Agenda" className="mb-5 flex h-11 items-center justify-center gap-3 rounded-lg lg:justify-start lg:px-2" href="/dashboard">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground">C</span>
            <span className="hidden font-display text-sm font-semibold lg:block">Calendar</span>
          </Link>
          <nav aria-label="Navegación principal" className="space-y-1">
            {desktopItems.map((item) => (
              <NavigationLink key={item.href} {...item} pathname={pathname} />
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t border-border pt-3">
            <div className="hidden lg:block"><UserIdentity user={user} /></div>
            <div className="flex items-center justify-center gap-1 lg:justify-start">
              <ThemeToggle />
              <Button aria-label="Cerrar sesión" onClick={() => void signOut({ callbackUrl: "/login" })} size="icon" type="button" variant="ghost">
                <LogOutIcon aria-hidden="true" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
            <div>
              <p className="font-display text-sm font-semibold">Calendar</p>
            </div>
            <div className="hidden items-center gap-2 md:flex lg:hidden"><UserIdentity user={user} /></div>
          </header>
          <div className="content-container w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
        </main>

        <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-background/98 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${navigationItems.length + 1}, minmax(0, 1fr))` }}>
          {navigationItems.map((item) => <NavigationLink compact key={item.href} {...item} pathname={pathname} />)}
          <button className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium text-muted-foreground" onClick={() => setMoreOpen(true)} type="button">
            <MenuIcon aria-hidden="true" className="size-5" />
            Más
          </button>
        </nav>

        <Drawer onOpenChange={setMoreOpen} open={moreOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Cuenta y opciones</DrawerTitle>
              <DrawerDescription>Tu perfil y preferencias de la aplicación.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <UserIdentity user={user} />
              {canAccessAdministration ? (
                <Link className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-medium" href="/settings" onClick={() => setMoreOpen(false)}>
                  <SettingsIcon aria-hidden="true" className="size-5" /> Administración
                </Link>
              ) : null}
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <ThemeToggle />
                <Button className="flex-1" onClick={() => void signOut({ callbackUrl: "/login" })} type="button" variant="outline">
                  <LogOutIcon aria-hidden="true" /> Cerrar sesión
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
