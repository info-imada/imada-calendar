"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CopyIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import {
  createManagedUser,
  updateManagedUser,
  type AuthorizationActionResult,
} from "@/app/actions/authorization";
import {
  ConfirmActionDialog,
  FormActions,
  FormSection,
  ResponsiveSheet,
} from "@/components/product/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScopeType = "GLOBAL" | "COUNTRY" | "TEAM";
type AuthMethod = "ZOHO" | "LOCAL";

export type ManagedUserFormModel = {
  actorPriority: number;
  isGlobalAdmin?: boolean;
  roles: { id: string; key: string; name: string; priority: number }[];
  countries: {
    id: string;
    name: string;
    teams: { id: string; name: string }[];
  }[];
};

export type EditableManagedUser = {
  id: string;
  name: string;
  email: string;
  hasZohoAccount: boolean;
  assignments?: {
    id: string;
    roleId: string;
    roleKey: string;
    roleName: string;
    rolePriority: number;
    scopeType: ScopeType;
    countryId: string | null;
    teamId: string | null;
  }[];
};

function resultMessage(result: AuthorizationActionResult) {
  if (result.success) return null;
  if (result.errorCode === "CONFLICT")
    return "Ya existe un usuario con ese correo electrónico.";
  if (result.errorCode === "FORBIDDEN")
    return "La política de seguridad bloqueó esta operación.";
  if (result.errorCode === "VALIDATION")
    return "Revisa los campos requeridos y vuelve a intentarlo.";
  return "No fue posible guardar el usuario. Inténtalo nuevamente.";
}

function FieldError({ error }: { error?: string }) {
  return error ? (
    <p aria-live="polite" className="text-xs text-destructive" role="alert">
      {error}
    </p>
  ) : null;
}

export function ManagedUserSheet({
  member,
  model,
  onOpenChange,
  onSaved,
  open,
}: {
  member?: EditableManagedUser | null;
  model: ManagedUserFormModel;
  onOpenChange: (open: boolean) => void;
  onSaved: (userId: string) => void;
  open: boolean;
}) {
  const assignableRoles = useMemo(
    () =>
      model.roles.filter(
        (role) =>
          role.priority < model.actorPriority ||
          (model.isGlobalAdmin && role.priority === model.actorPriority),
      ),
    [model.actorPriority, model.isGlobalAdmin, model.roles],
  );
  const currentAssignment = member?.assignments?.[0];
  const defaultRoleId = useMemo(
    () =>
      model.roles.find((role) => role.key === "TECNICO")?.id ??
      assignableRoles[0]?.id ??
      "",
    [assignableRoles, model.roles],
  );
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("ZOHO");
  const [accessStatus, setAccessStatus] = useState<"PENDING" | "ACTIVE">(
    "ACTIVE",
  );
  const [roleId, setRoleId] = useState(
    currentAssignment?.roleId ?? defaultRoleId,
  );
  const [scopeType, setScopeType] = useState<ScopeType>(
    currentAssignment?.scopeType ?? "GLOBAL",
  );
  const [countryId, setCountryId] = useState(
    currentAssignment?.countryId ?? model.countries[0]?.id ?? "",
  );
  const [teamId, setTeamId] = useState(
    currentAssignment?.teamId ?? model.countries[0]?.teams[0]?.id ?? "",
  );
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [emailStatus, setEmailStatus] = useState<
    "SENT" | "QUEUED" | "FAILED" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const isEditing = Boolean(member);
  const selectedCountry = model.countries.find(
    (country) => country.id === countryId,
  );

  function validateStep(stepToValidate: number) {
    const nextErrors: Record<string, string> = {};
    if (stepToValidate === 1) {
      if (!name.trim()) nextErrors.name = "Indica el nombre completo.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        nextErrors.email = "Indica un correo electrónico válido.";
    }
    if (stepToValidate === 3) {
      if (!roleId) nextErrors.roleId = "Selecciona un rol inicial.";
      if (scopeType === "COUNTRY" && !countryId)
        nextErrors.countryId = "Selecciona un país.";
      if (scopeType === "TEAM" && !teamId)
        nextErrors.teamId = "Selecciona un equipo.";
    }
    setFieldErrors(nextErrors);
    return nextErrors;
  }

  function focusFirstError(errors: Record<string, string>) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    window.setTimeout(() =>
      document
        .querySelector<HTMLElement>(`#managed-user-${firstField}`)
        ?.focus(),
    );
  }

  function goToNextStep() {
    const errors = validateStep(step);
    if (Object.keys(errors).length) {
      setError("Completa los campos obligatorios para continuar.");
      focusFirstError(errors);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, 4));
  }

  function scopeInput() {
    if (scopeType === "COUNTRY") return { scopeType, countryId } as const;
    if (scopeType === "TEAM") return { scopeType, teamId } as const;
    return { scopeType } as const;
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createManagedUser({
        accessStatus,
        authMethod,
        email,
        name,
        roleId,
        ...scopeInput(),
      });
      const message = resultMessage(result);
      if (message) {
        setError(message);
        return;
      }
      if (!result.success || !result.entityId) return;
      onSaved(result.entityId);
      setEmailStatus(result.emailStatus ?? null);
      toast.success(
        result.emailStatus === "SENT"
          ? "Usuario creado y correo enviado"
          : "Usuario creado y registrado en auditoría",
      );
      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      } else {
        onOpenChange(false);
      }
    });
  }

  function handleUpdate() {
    if (!member) return;
    setConfirmEdit(false);
    setError(null);
    startTransition(async () => {
      const result = await updateManagedUser({
        assignmentId: currentAssignment?.id,
        email,
        name,
        roleId,
        userId: member.id,
        ...scopeInput(),
      });
      const message = resultMessage(result);
      if (message) {
        setError(message);
        return;
      }
      if (!result.success) return;
      onSaved(member.id);
      toast.success("Perfil actualizado y registrado en auditoría");
      onOpenChange(false);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Keep keyboard/native submits from persisting a partially completed
    // wizard. Creation is only valid from the explicit final CTA.
    if (!isEditing && step < 4) {
      goToNextStep();
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (
      !(submitter instanceof HTMLElement) ||
      submitter.dataset.formSubmit !== "managed-user-save"
    ) {
      return;
    }
    if (isEditing) setConfirmEdit(true);
    else handleCreate();
  }

  const canSubmit = Boolean(
    name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    (isEditing ||
      (roleId &&
        (scopeType === "GLOBAL" ||
          (scopeType === "COUNTRY" && countryId) ||
          (scopeType === "TEAM" && teamId)))),
  );

  return (
    <>
      <ResponsiveSheet
        description={
          isEditing
            ? "Actualiza identidad, rol y alcance. Estado y contraseña se gestionan como acciones protegidas."
            : "Crea la identidad, asigna su acceso y envía la bienvenida por correo."
        }
        eyebrow="Equipo"
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTemporaryPassword(null);
          onOpenChange(nextOpen);
        }}
        open={open}
        title={isEditing ? "Editar usuario" : "Nuevo usuario"}
      >
        {temporaryPassword ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
            <Alert className="status-warning">
              <KeyRoundIcon />
              <AlertTitle>Guárdala ahora</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>
                  Esta contraseña temporal solo se mostrará durante este paso.
                </p>
                <p>
                  {emailStatus === "SENT"
                    ? "Las credenciales se enviaron al usuario por correo."
                    : "No se pudo confirmar el envío. Copia la contraseña y compártela por un canal seguro."}
                </p>
                <code className="block rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold break-all">
                  {temporaryPassword}
                </code>
                <Button
                  onClick={() => {
                    void navigator.clipboard.writeText(temporaryPassword);
                    toast.success("Contraseña copiada");
                  }}
                  type="button"
                  variant="outline"
                >
                  <CopyIcon /> Copiar contraseña
                </Button>
              </AlertDescription>
            </Alert>
            <FormActions>
              <Button onClick={() => onOpenChange(false)} type="button">
                Finalizar
              </Button>
            </FormActions>
          </div>
        ) : (
          <form
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6"
            onSubmit={submit}
          >
            {!isEditing ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Paso {step} de 4</p>
                <div aria-hidden="true" className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((item) => (
                    <span
                      className={
                        item <= step
                          ? "h-1 rounded-full bg-primary"
                          : "h-1 rounded-full bg-muted"
                      }
                      key={item}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {isEditing || step === 1 ? (
              <FormSection
                density="compact"
                description="Datos visibles y utilizados para identificar la cuenta."
                title="Identidad"
              >
                <div className="space-y-2">
                  <Label htmlFor="managed-user-name">Nombre completo</Label>
                  <Input
                    aria-describedby={
                      fieldErrors.name ? "managed-user-name-error" : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.name)}
                    autoComplete="name"
                    id="managed-user-name"
                    onChange={(event) => {
                      setName(event.target.value);
                      setFieldErrors((current) => ({ ...current, name: "" }));
                    }}
                    placeholder="Ej. Ana Torres"
                    required
                    value={name}
                  />
                  <FieldError error={fieldErrors.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managed-user-email">Correo electrónico</Label>
                  <Input
                    aria-describedby={
                      fieldErrors.email ? "managed-user-email-error" : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.email)}
                    autoComplete="email"
                    disabled={Boolean(member?.hasZohoAccount)}
                    id="managed-user-email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldErrors((current) => ({ ...current, email: "" }));
                    }}
                    placeholder="ana.torres@combilift.com"
                    required
                    type="email"
                    value={email}
                  />
                  <FieldError error={fieldErrors.email} />
                  {member?.hasZohoAccount ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      El correo está vinculado a Zoho y debe mantenerse
                      sincronizado con el proveedor.
                    </p>
                  ) : null}
                </div>
              </FormSection>
            ) : null}

            {!isEditing && step === 2 ? (
              <>
                <FormSection
                  density="compact"
                  description="Zoho vincula la cuenta corporativa; local genera una contraseña temporal."
                  title="Método de acceso"
                >
                  <div className="space-y-2">
                    <Label>Método de acceso</Label>
                    <Select
                      onValueChange={(value) =>
                        setAuthMethod((value ?? "ZOHO") as AuthMethod)
                      }
                      value={authMethod}
                    >
                      <SelectTrigger
                        aria-label="Método de acceso"
                        className="w-full"
                      >
                        <SelectValue>
                          {authMethod === "ZOHO"
                            ? "Cuenta Zoho"
                            : "Cuenta local"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZOHO">Cuenta Zoho</SelectItem>
                        <SelectItem value="LOCAL">Cuenta local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Alert>
                    <ShieldCheckIcon />
                    <AlertTitle>
                      {authMethod === "ZOHO"
                        ? "Acceso corporativo"
                        : "Credenciales por correo"}
                    </AlertTitle>
                    <AlertDescription>
                      {authMethod === "ZOHO"
                        ? "El usuario recibirá la bienvenida y entrará con el mismo correo desde Zoho."
                        : "El usuario recibirá una contraseña temporal y también podrás copiarla una sola vez."}
                    </AlertDescription>
                  </Alert>
                </FormSection>
              </>
            ) : null}

            {isEditing || step === 3 ? (
              <FormSection
                density="compact"
                description="El rol y el territorio se validan contra tu prioridad administrativa."
                title="Rol y alcance inicial"
              >
                <div className="space-y-2">
                  <Label>{isEditing ? "Rol" : "Rol inicial"}</Label>
                  <Select
                    onValueChange={(value) => {
                      setRoleId(value ?? "");
                      setFieldErrors((current) => ({ ...current, roleId: "" }));
                    }}
                    value={roleId}
                  >
                    <SelectTrigger
                      aria-describedby={
                        fieldErrors.roleId
                          ? "managed-user-roleId-error"
                          : undefined
                      }
                      aria-invalid={Boolean(fieldErrors.roleId)}
                      aria-label={isEditing ? "Rol" : "Rol inicial"}
                      className="w-full"
                      id="managed-user-roleId"
                    >
                      <SelectValue placeholder="Selecciona un rol">
                        {
                          assignableRoles.find((role) => role.id === roleId)
                            ?.name
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={fieldErrors.roleId} />
                </div>
                <div className="space-y-2">
                  <Label>{isEditing ? "Alcance" : "Alcance inicial"}</Label>
                  <Select
                    onValueChange={(value) =>
                      setScopeType((value ?? "GLOBAL") as ScopeType)
                    }
                    value={scopeType}
                  >
                    <SelectTrigger
                      aria-label={isEditing ? "Alcance" : "Alcance inicial"}
                      className="w-full"
                    >
                      <SelectValue>
                        {scopeType === "GLOBAL"
                          ? "Global"
                          : scopeType === "COUNTRY"
                            ? "País"
                            : "Equipo"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">Global</SelectItem>
                      <SelectItem value="COUNTRY">País</SelectItem>
                      <SelectItem value="TEAM">Equipo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scopeType !== "GLOBAL" ? (
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select
                      onValueChange={(value) => {
                        const next = value ?? "";
                        setCountryId(next);
                        setTeamId(
                          model.countries.find((country) => country.id === next)
                            ?.teams[0]?.id ?? "",
                        );
                      }}
                      value={countryId}
                    >
                      <SelectTrigger
                        aria-label={isEditing ? "País" : "País inicial"}
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecciona un país">
                          {selectedCountry?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {model.countries.map((country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {scopeType === "TEAM" ? (
                  <div className="space-y-2">
                    <Label>Equipo</Label>
                    <Select
                      onValueChange={(value) => setTeamId(value ?? "")}
                      value={teamId}
                    >
                      <SelectTrigger
                        aria-label={isEditing ? "Equipo" : "Equipo inicial"}
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecciona un equipo">
                          {
                            selectedCountry?.teams.find(
                              (team) => team.id === teamId,
                            )?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCountry?.teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </FormSection>
            ) : null}

            {!isEditing && step === 4 ? (
              <>
                <FormSection
                  density="compact"
                  description="Pendiente bloquea el acceso operativo hasta su activación posterior."
                  title="Estado inicial"
                >
                  <Select
                    onValueChange={(value) =>
                      setAccessStatus(
                        (value ?? "ACTIVE") as "PENDING" | "ACTIVE",
                      )
                    }
                    value={accessStatus}
                  >
                    <SelectTrigger
                      aria-label="Estado inicial"
                      className="w-full"
                    >
                      <SelectValue>
                        {accessStatus === "ACTIVE" ? "Activo" : "Pendiente"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </FormSection>
                <FormSection
                  density="compact"
                  description="Confirma que la identidad y el acceso sean correctos."
                  title="Revisa antes de crear"
                >
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Persona</dt>
                      <dd className="font-medium">
                        {name || "Sin nombre"} · {email || "Sin correo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Acceso</dt>
                      <dd className="font-medium">
                        {authMethod === "ZOHO" ? "Cuenta Zoho" : "Cuenta local"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Rol</dt>
                      <dd className="font-medium">
                        {assignableRoles.find((role) => role.id === roleId)
                          ?.name ?? "Sin rol"}
                      </dd>
                    </div>
                  </dl>
                </FormSection>
              </>
            ) : null}

            {error ? (
              <Alert aria-live="polite" role="alert" variant="destructive">
                <AlertTitle>No se guardaron los cambios</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <FormActions>
              <Button
                onClick={() =>
                  !isEditing && step > 1
                    ? setStep((current) => current - 1)
                    : onOpenChange(false)
                }
                type="button"
                variant="outline"
              >
                {!isEditing && step > 1 ? "Atrás" : "Cancelar"}
              </Button>
              {!isEditing && step < 4 ? (
                <Button onClick={goToNextStep} type="button">
                  Siguiente
                </Button>
              ) : (
                <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1 sm:items-end">
                  <Button
                    className="w-full sm:w-auto"
                    data-form-submit="managed-user-save"
                    disabled={pending || !canSubmit}
                    type="submit"
                  >
                    {pending
                      ? "Guardando…"
                      : isEditing
                        ? "Guardar cambios"
                        : "Crear usuario"}
                  </Button>
                  {!canSubmit ? (
                    <p className="text-right text-xs text-muted-foreground">
                      Completa los campos obligatorios para guardar.
                    </p>
                  ) : null}
                </div>
              )}
            </FormActions>
          </form>
        )}
      </ResponsiveSheet>

      <ConfirmActionDialog
        confirmLabel="Guardar cambios"
        description={
          member
            ? `Actualizarás la identidad y el acceso operativo de ${member.name}. Los permisos individuales y las acciones sensibles se mantienen protegidos.`
            : ""
        }
        onConfirm={handleUpdate}
        onOpenChange={setConfirmEdit}
        open={confirmEdit}
        title="Confirmar edición"
      />
    </>
  );
}
