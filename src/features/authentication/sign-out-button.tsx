"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return <Button className="w-full" onClick={() => signOut({ callbackUrl: "/login" })} type="button" variant="outline">Cerrar sesión</Button>;
}
