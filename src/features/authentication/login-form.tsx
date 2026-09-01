"use client";

import Image from "next/image";
import { Eye, EyeOff, LoaderCircle, LockKeyholeIcon, MailIcon, TriangleAlertIcon } from "lucide-react";
import { getCsrfToken, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authenticationMessages } from "@/messages/common";

export function LoginForm({ authenticationError = false, zohoEnabled = false }: { authenticationError?: boolean; zohoEnabled?: boolean }) {
  const [submittingProvider, setSubmittingProvider] = useState<"zoho" | "credentials" | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(
    authenticationError ? authenticationMessages.errors.invalidCredentials : null,
  );
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [showLocal, setShowLocal] = useState(!zohoEnabled || authenticationError);

  useEffect(() => {
    if (authenticationError) {
      window.history.replaceState(window.history.state, "", "/login");
    }

    void getCsrfToken()
      .then((token) => {
        if (!token) throw new Error("Missing CSRF token");
        setCsrfToken(token);
      })
      .catch(() => setError(authenticationMessages.errors.unexpected));
  }, [authenticationError]);

  async function handleZoho() {
    setSubmittingProvider("zoho");
    setError(null);
    try {
      const result = await signIn("zoho", { callbackUrl: "/" });
      if (result?.error) setError(authenticationMessages.errors.unexpected);
    } catch {
      setError(authenticationMessages.errors.unexpected);
    } finally {
      setSubmittingProvider(null);
    }
  }

  return (
    <form
      action="/api/auth/callback/credentials"
      className="space-y-4"
      method="post"
      onSubmit={() => {
        setSubmittingProvider("credentials");
        setError(null);
      }}
    >
      <Input name="csrfToken" type="hidden" value={csrfToken ?? ""} />
      <Input name="callbackUrl" type="hidden" value="/" />
      {zohoEnabled ? <Button className="h-11 w-full gap-3 text-sm" disabled={Boolean(submittingProvider)} onClick={handleZoho} type="button">
        {submittingProvider === "zoho" ? <LoaderCircle className="animate-spin" /> : <Image alt="" aria-hidden="true" className="h-5 w-auto" height={20} src="/zoho-svgrepo-com.svg" width={58} />}
        {authenticationMessages.login.zoho}
      </Button> : null}
      {zohoEnabled ? <Button className="w-full" onClick={() => setShowLocal((visible) => !visible)} type="button" variant="ghost">{showLocal ? "Ocultar cuenta local" : "Usar cuenta local"}</Button> : null}
      {showLocal ? <>
      <div className="space-y-2">
        <Label htmlFor="email">{authenticationMessages.login.email}</Label>
        <div className="relative">
          <MailIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoComplete="email" className="h-10 pl-9" id="email" name="email" placeholder="nombre@empresa.com" required type="email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{authenticationMessages.login.password}</Label>
        <div className="relative">
          <LockKeyholeIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoComplete="current-password" className="h-10 pr-10 pl-9" id="password" name="password" placeholder="Ingresa tu contraseña" required type={isPasswordVisible ? "text" : "password"} />
          <Tooltip>
            <TooltipTrigger render={<Button aria-label={isPasswordVisible ? authenticationMessages.actions.hidePassword : authenticationMessages.actions.showPassword} className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setIsPasswordVisible((visible) => !visible)} size="icon-sm" type="button" variant="ghost" />}>
              {isPasswordVisible ? <EyeOff /> : <Eye />}
            </TooltipTrigger>
            <TooltipContent>{isPasswordVisible ? authenticationMessages.actions.hidePassword : authenticationMessages.actions.showPassword}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {error ? <Alert variant="destructive"><TriangleAlertIcon /><AlertTitle>No pudimos iniciar sesión</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Button className="h-10 w-full" disabled={Boolean(submittingProvider) || !csrfToken} type="submit">
        {submittingProvider === "credentials" ? <LoaderCircle className="animate-spin" /> : null}
        {submittingProvider === "credentials" ? authenticationMessages.login.loading : authenticationMessages.login.submit}
      </Button>
      </> : null}
    </form>
  );
}
