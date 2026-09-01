"use client";

import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { changePassword } from "@/app/actions/authentication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticationMessages } from "@/messages/common";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await changePassword({ password: String(formData.get("password")), confirmPassword: String(formData.get("confirmPassword")) });
    setIsSubmitting(false);
    if (!result.success) {
      setError(authenticationMessages.errors.passwordInvalid);
      return;
    }
    await signOut({ callbackUrl: "/login" });
  }

  const matches = Boolean(confirmation) && password === confirmation;
  return <form className="space-y-5" onSubmit={handleSubmit}>
    <div className="space-y-2"><Label htmlFor="password">{authenticationMessages.changePassword.password}</Label><div className="relative"><Input id="password" minLength={12} name="password" onChange={(event) => setPassword(event.target.value)} required type={visible ? "text" : "password"} value={password} /><Button aria-label={visible ? "Ocultar contraseñas" : "Mostrar contraseñas"} className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setVisible((value) => !value)} size="icon-sm" type="button" variant="ghost">{visible ? <EyeOffIcon /> : <EyeIcon />}</Button></div><p className="text-xs text-muted-foreground">Usa al menos 12 caracteres.</p></div>
    <div className="space-y-2"><Label htmlFor="confirmPassword">{authenticationMessages.changePassword.confirmPassword}</Label><Input aria-describedby="password-match" id="confirmPassword" minLength={12} name="confirmPassword" onChange={(event) => setConfirmation(event.target.value)} required type={visible ? "text" : "password"} value={confirmation} /><p className={matches ? "text-xs text-primary" : "text-xs text-muted-foreground"} id="password-match">{confirmation ? (matches ? "Las contraseñas coinciden." : "Las contraseñas todavía no coinciden.") : "Repite la nueva contraseña."}</p></div>
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    <Button className="w-full" disabled={isSubmitting || password.length < 12 || !matches} type="submit">{authenticationMessages.changePassword.submit}</Button>
  </form>;
}
