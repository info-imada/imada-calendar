"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CopyIcon,
  FilterXIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserCogIcon,
  UserRoundIcon,
  UserXIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignUserRole,
  deleteUserPermissionOverride,
  resetTemporaryPassword,
  revokeUserRole,
  setManagedUserStatus,
  setUserPermissionOverride,
  type AuthorizationActionResult,
} from "@/app/actions/authorization";
import { ConfirmActionDialog, FormSection, ResponsiveSheet } from "@/components/product/forms";
import {
  FilterBar,
  OperationalToolbar,
  PageContainer,
  PageHeader,
} from "@/components/product/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ManagedUserSheet } from "@/features/team/managed-user-sheet";
import { MemberDetailNavigation } from "@/features/team/member-detail-navigation";

type AccessStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
type ScopeType = "GLOBAL" | "COUNTRY" | "TEAM";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  accessStatus?: AccessStatus;
  hasLocalCredential?: boolean;
  hasZohoAccount?: boolean;
  activities: number;
  nextAbsence: string | null;
  scope?: string;
  assignments?: {
    id: string;
    roleId: string;
    roleKey: string;
    roleName: string;
    rolePriority: number;
    scopeType: ScopeType;
    countryId: string | null;
    teamId: string | null;
    scopeLabel: string;
  }[];
  permissionScopes?: {
    key: string;
    label: string;
    permissions: {
      key: string;
      label: string;
      category: string;
      source: "role" | "override";
    }[];
  }[];
  overrides?: {
    id: string;
    permissionId: string;
    permissionKey: string;
    permissionLabel: string;
    category: string;
    effect: "GRANT" | "DENY";
    scopeLabel: string;
  }[];
};

export type TeamWorkspaceModel = {
  currentUserId: string;
  canManageUsers: boolean;
  isGlobalAdmin: boolean;
  actorPriority: number;
  members: TeamMember[];
  roles: { id: string; key: string; name: string; priority: number }[];
  permissions: { id: string; key: string; label: string; category: string }[];
  countries: {
    id: string;
    name: string;
    teams: { id: string; name: string }[];
  }[];
};

type PendingConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<AuthorizationActionResult>;
};

const statusLabels: Record<AccessStatus, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
};

const statusClasses: Record<AccessStatus, string> = {
  PENDING: "status-warning",
  ACTIVE: "status-success",
  SUSPENDED: "status-danger",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MemberDetail({
  member,
  model,
  onConfirm,
  onEdit,
}: {
  member: TeamMember;
  model: TeamWorkspaceModel;
  onConfirm: (confirmation: PendingConfirmation) => void;
  onEdit: (member: TeamMember) => void;
}) {
  const currentAssignment = member.assignments?.[0];
  const [scopeType, setScopeType] = useState<ScopeType>(currentAssignment?.scopeType ?? "GLOBAL");
  const [countryId, setCountryId] = useState(currentAssignment?.countryId ?? model.countries[0]?.id ?? "");
  const [teamId, setTeamId] = useState(currentAssignment?.teamId ?? model.countries[0]?.teams[0]?.id ?? "");
  const [roleId, setRoleId] = useState(
    currentAssignment?.roleId ?? model.roles.find((role) => role.priority < model.actorPriority)?.id ?? "",
  );
  const [permissionId, setPermissionId] = useState(model.permissions[0]?.id ?? "");
  const [effect, setEffect] = useState<"GRANT" | "DENY">("DENY");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [section, setSection] = useState("summary");
  const isSelf = member.id === model.currentUserId;
  const canMutate = model.canManageUsers && !isSelf;
  const selectedCountry = model.countries.find((country) => country.id === countryId);
  const assignableRoles = model.roles.filter((role) =>
    role.priority < model.actorPriority ||
    (model.isGlobalAdmin && role.priority === model.actorPriority),
  );

  function assignmentInput() {
    if (scopeType === "COUNTRY") return { scopeType, countryId } as const;
    if (scopeType === "TEAM") return { scopeType, teamId } as const;
    return { scopeType } as const;
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6">
      {model.isGlobalAdmin && !isSelf ? (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => onEdit(member)} size="sm" type="button" variant="outline">
            <PencilIcon /> Editar usuario
          </Button>
        </div>
      ) : null}
      <Tabs onValueChange={(value) => setSection(String(value))} value={section}>
        <MemberDetailNavigation
          onValueChange={setSection}
          showAdvanced={model.isGlobalAdmin && !isSelf}
          value={section}
        />

        <TabsContent className="space-y-3 pt-3" value="summary">
          <FormSection density="compact" description="Identidad y situación operativa actual." title="Perfil">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="mt-1 break-all text-sm font-medium">{member.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio de sesión</p>
                <p className="mt-1 text-sm font-medium">
                  {member.hasLocalCredential ? "Cuenta local" : "Proveedor externo"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carga próxima</p>
                <p className="mt-1 text-sm font-medium">{member.activities} actividades</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponibilidad</p>
                <p className="mt-1 text-sm font-medium">
                  {member.nextAbsence ? `Ausencia: ${member.nextAbsence}` : "Disponible"}
                </p>
              </div>
            </div>
          </FormSection>
          <FormSection density="compact" description="Roles asignados y territorio donde aplican." title="Roles y alcance">
            {member.assignments?.length ? (
              <div className="space-y-2">
                {member.assignments.map((assignment) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3" key={assignment.id}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{assignment.roleName}</p>
                      <p className="truncate text-xs text-muted-foreground">{assignment.scopeLabel}</p>
                    </div>
                    {canMutate ? (
                      <Button
                        aria-label={`Revocar ${assignment.roleName}`}
                        onClick={() =>
                          onConfirm({
                            title: "Revocar asignación",
                            description: `Se retirará el rol ${assignment.roleName} en ${assignment.scopeLabel}.`,
                            confirmLabel: "Revocar rol",
                            destructive: true,
                            run: () => revokeUserRole({ assignmentId: assignment.id }),
                          })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Revocar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Este usuario no tiene roles asignados.</p>
            )}
          </FormSection>
        </TabsContent>

        <TabsContent className="space-y-3 pt-3" value="permissions">
          {member.permissionScopes?.length ? (
            member.permissionScopes.map((scope) => {
              const categories = scope.permissions.reduce(
                (groups, permission) => {
                  const group = groups.get(permission.category) ?? [];
                  group.push(permission);
                  groups.set(permission.category, group);
                  return groups;
                },
                new Map<
                  string,
                  (typeof scope.permissions)[number][]
                >(),
              );
              return (
                <FormSection density="compact" key={scope.key} title={scope.label}>
                  {[...categories.entries()].map(([category, permissions]) => (
                    <div key={category}>
                      <p className="label-overline mb-2">{category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {permissions.map((permission) => (
                          <Badge className={permission.source === "override" ? "status-info" : undefined} key={permission.key} variant="outline">
                            {permission.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </FormSection>
              );
            })
          ) : (
            <Alert>
              <LockKeyholeIcon />
              <AlertTitle>Sin permisos efectivos</AlertTitle>
              <AlertDescription>Asigna un rol para habilitar capacidades operativas.</AlertDescription>
            </Alert>
          )}
          <FormSection density="compact" description="Excepciones explícitas aplicadas sobre los permisos heredados." title="Overrides">
            {member.overrides?.length ? (
              <div className="space-y-2">
                {member.overrides.map((override) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3" key={override.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={override.effect === "DENY" ? "status-danger" : "status-success"} variant="outline">
                          {override.effect === "DENY" ? "Denegar" : "Conceder"}
                        </Badge>
                        <p className="text-sm font-medium">{override.permissionLabel}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{override.scopeLabel}</p>
                    </div>
                    {model.isGlobalAdmin && !isSelf ? (
                      <Button
                        aria-label={`Eliminar override ${override.permissionLabel}`}
                        onClick={() =>
                          onConfirm({
                            title: "Eliminar excepción",
                            description: `Se restaurará el permiso heredado para ${override.permissionLabel}.`,
                            confirmLabel: "Eliminar override",
                            destructive: true,
                            run: () => deleteUserPermissionOverride({ overrideId: override.id }),
                          })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay excepciones individuales.</p>
            )}
          </FormSection>
        </TabsContent>

        {model.isGlobalAdmin && !isSelf ? <TabsContent className="space-y-3 pt-3" value="access">
          {!canMutate ? (
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>Acceso de solo lectura</AlertTitle>
              <AlertDescription>
                {isSelf ? "No puedes modificar tu propia seguridad." : "Tu alcance no permite administrar este usuario."}
              </AlertDescription>
            </Alert>
          ) : null}

          {canMutate && assignableRoles.length ? (
            <FormSection density="compact" description="El backend volverá a validar prioridad y contención territorial." title="Asignar rol">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Rol</Label>
                  <Select onValueChange={(value) => setRoleId(value ?? "")} value={roleId}>
                    <SelectTrigger className="w-full" aria-label="Rol a asignar"><SelectValue placeholder="Selecciona un rol">{model.roles.find((role) => role.id === roleId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>{assignableRoles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Alcance</Label>
                  <Select onValueChange={(value) => setScopeType((value ?? "GLOBAL") as ScopeType)} value={scopeType}>
                    <SelectTrigger className="w-full" aria-label="Alcance del rol"><SelectValue>{scopeType === "GLOBAL" ? "Global" : scopeType === "COUNTRY" ? "País" : "Equipo"}</SelectValue></SelectTrigger>
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
                    <Select onValueChange={(value) => { const next = value ?? ""; setCountryId(next); setTeamId(model.countries.find((country) => country.id === next)?.teams[0]?.id ?? ""); }} value={countryId}>
                      <SelectTrigger className="w-full" aria-label="País del alcance"><SelectValue placeholder="Selecciona un país">{selectedCountry?.name}</SelectValue></SelectTrigger>
                      <SelectContent>{model.countries.map((country) => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : null}
                {scopeType === "TEAM" ? (
                  <div className="space-y-2">
                    <Label>Equipo</Label>
                    <Select onValueChange={(value) => setTeamId(value ?? "")} value={teamId}>
                      <SelectTrigger className="w-full" aria-label="Equipo del alcance"><SelectValue placeholder="Selecciona un equipo">{selectedCountry?.teams.find((team) => team.id === teamId)?.name}</SelectValue></SelectTrigger>
                      <SelectContent>{selectedCountry?.teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <Button
                disabled={!roleId || (scopeType === "COUNTRY" && !countryId) || (scopeType === "TEAM" && !teamId)}
                onClick={() => {
                  const role = model.roles.find((item) => item.id === roleId);
                  onConfirm({
                    title: "Confirmar asignación",
                    description: `Asignarás ${role?.name ?? "este rol"} a ${member.name}.`,
                    confirmLabel: "Asignar rol",
                    run: () => assignUserRole({ userId: member.id, roleId, ...assignmentInput() }),
                  });
                }}
              >
                <UserCogIcon /> Asignar rol
              </Button>
            </FormSection>
          ) : null}

          {model.isGlobalAdmin && !isSelf ? (
            <FormSection density="compact" description="DENY siempre prevalece sobre permisos heredados o concedidos." title="Excepción individual">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Permiso</Label>
                  <Select onValueChange={(value) => setPermissionId(value ?? "")} value={permissionId}>
                    <SelectTrigger className="w-full" aria-label="Permiso individual"><SelectValue placeholder="Selecciona un permiso">{model.permissions.find((permission) => permission.id === permissionId)?.label}</SelectValue></SelectTrigger>
                    <SelectContent>{model.permissions.map((permission) => <SelectItem key={permission.id} value={permission.id}>{permission.category} · {permission.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Efecto</Label>
                  <Select onValueChange={(value) => setEffect((value ?? "DENY") as "GRANT" | "DENY")} value={effect}>
                    <SelectTrigger className="w-full" aria-label="Efecto del permiso"><SelectValue>{effect === "DENY" ? "Denegar" : "Conceder"}</SelectValue></SelectTrigger>
                    <SelectContent><SelectItem value="DENY">Denegar</SelectItem><SelectItem value="GRANT">Conceder</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alcance</Label>
                  <Select onValueChange={(value) => setScopeType((value ?? "GLOBAL") as ScopeType)} value={scopeType}>
                    <SelectTrigger className="w-full" aria-label="Alcance del permiso"><SelectValue>{scopeType === "GLOBAL" ? "Global" : scopeType === "COUNTRY" ? "País" : "Equipo"}</SelectValue></SelectTrigger>
                    <SelectContent><SelectItem value="GLOBAL">Global</SelectItem><SelectItem value="COUNTRY">País</SelectItem><SelectItem value="TEAM">Equipo</SelectItem></SelectContent>
                  </Select>
                </div>
                {scopeType !== "GLOBAL" ? (
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select onValueChange={(value) => { const next = value ?? ""; setCountryId(next); setTeamId(model.countries.find((country) => country.id === next)?.teams[0]?.id ?? ""); }} value={countryId}>
                      <SelectTrigger className="w-full" aria-label="País del permiso"><SelectValue placeholder="Selecciona un país">{selectedCountry?.name}</SelectValue></SelectTrigger>
                      <SelectContent>{model.countries.map((country) => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : null}
                {scopeType === "TEAM" ? (
                  <div className="space-y-2">
                    <Label>Equipo</Label>
                    <Select onValueChange={(value) => setTeamId(value ?? "")} value={teamId}>
                      <SelectTrigger className="w-full" aria-label="Equipo del permiso"><SelectValue placeholder="Selecciona un equipo">{selectedCountry?.teams.find((team) => team.id === teamId)?.name}</SelectValue></SelectTrigger>
                      <SelectContent>{selectedCountry?.teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <Button
                disabled={!permissionId || (scopeType === "COUNTRY" && !countryId) || (scopeType === "TEAM" && !teamId)}
                onClick={() => {
                  const permission = model.permissions.find((item) => item.id === permissionId);
                  onConfirm({
                    title: "Confirmar excepción",
                    description: `${effect === "DENY" ? "Denegarás" : "Concederás"} ${permission?.label ?? "el permiso"} a ${member.name}.`,
                    confirmLabel: "Aplicar override",
                    destructive: effect === "DENY",
                    run: () => setUserPermissionOverride({ userId: member.id, permissionId, effect, ...assignmentInput() }),
                  });
                }}
              >
                <KeyRoundIcon /> Aplicar override
              </Button>
            </FormSection>
          ) : null}

          {model.isGlobalAdmin && !isSelf ? (
            <FormSection density="compact" description="Acciones sensibles disponibles únicamente para ADMIN GLOBAL." title="Estado y autenticación">
              <div className="flex flex-wrap gap-2">
                {member.accessStatus !== "ACTIVE" ? (
                  <Button onClick={() => onConfirm({ title: "Activar usuario", description: `${member.name} podrá iniciar sesión inmediatamente.`, confirmLabel: "Activar", run: () => setManagedUserStatus({ userId: member.id, accessStatus: "ACTIVE" }) })} variant="outline"><UserCheckIcon /> Activar</Button>
                ) : (
                  <Button onClick={() => onConfirm({ title: "Suspender usuario", description: `${member.name} perderá acceso al sistema hasta una reactivación.`, confirmLabel: "Suspender", destructive: true, run: () => setManagedUserStatus({ userId: member.id, accessStatus: "SUSPENDED" }) })} variant="destructive"><UserXIcon /> Suspender</Button>
                )}
                {member.hasLocalCredential ? (
                  <Button onClick={() => onConfirm({ title: "Restablecer contraseña", description: "Se generará una contraseña temporal de un solo uso y el usuario deberá cambiarla al entrar.", confirmLabel: "Generar contraseña", run: async () => { const result = await resetTemporaryPassword({ userId: member.id }); if (result.success) setTemporaryPassword(result.temporaryPassword ?? null); return result; } })} variant="outline"><KeyRoundIcon /> Contraseña temporal</Button>
                ) : null}
              </div>
              {temporaryPassword ? (
                <Alert className="status-warning">
                  <KeyRoundIcon />
                  <AlertTitle>Contraseña temporal</AlertTitle>
                  <AlertDescription className="mt-2 flex flex-col gap-2">
                    <code className="rounded-md bg-background px-3 py-2 text-sm font-semibold break-all">{temporaryPassword}</code>
                    <Button onClick={() => { void navigator.clipboard.writeText(temporaryPassword); toast.success("Contraseña copiada"); }} size="sm" variant="outline"><CopyIcon /> Copiar ahora</Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </FormSection>
          ) : null}
        </TabsContent> : null}
      </Tabs>
    </div>
  );
}

export function TeamWorkspace({
  members,
  model,
}: {
  members?: TeamMember[];
  model?: TeamWorkspaceModel;
}) {
  const workspace: TeamWorkspaceModel = model ?? {
    currentUserId: "",
    canManageUsers: false,
    isGlobalAdmin: false,
    actorPriority: 0,
    members: members ?? [],
    roles: [],
    permissions: [],
    countries: [],
  };
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | AccessStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [managedEditor, setManagedEditor] = useState<{ member?: TeamMember } | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedMember = workspace.members.find((member) => member.id === selectedId) ?? null;

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return workspace.members.filter((member) => {
      const scopes = member.assignments?.map((assignment) => assignment.scopeLabel) ?? [member.scope ?? ""];
      const matchesQuery = !normalizedQuery || [member.name, member.email, ...scopes].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesQuery && (status === "ALL" || (member.accessStatus ?? "ACTIVE") === status);
    });
  }, [query, status, workspace.members]);
  const activeFilterCount = (query.trim() ? 1 : 0) + (status !== "ALL" ? 1 : 0);

  function executeConfirmation() {
    if (!confirmation) return;
    const action = confirmation.run;
    setConfirmation(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success("Cambio aplicado y auditado");
        router.refresh();
      } else {
        toast.error(result.errorCode === "FORBIDDEN" ? "La política de seguridad bloqueó el cambio" : "No fue posible aplicar el cambio");
      }
    });
  }

  return (
    <PageContainer>
      <PageHeader
        actions={workspace.isGlobalAdmin ? <Button onClick={() => setManagedEditor({})}><PlusIcon /> Nuevo usuario</Button> : null}
        density="compact"
        description="Gestiona estado, roles, alcance y permisos efectivos de cada usuario."
        eyebrow="Gestión de personas"
        title="Equipo y accesos"
      />
      <OperationalToolbar className="mt-2" label="Herramientas del equipo" meta={<span>{filteredMembers.length} {filteredMembers.length === 1 ? "persona" : "personas"}</span>}>
        <FilterBar activeCount={activeFilterCount} className="grid w-full gap-2 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto]" label="Filtrar usuarios">
          <div className="relative min-w-0">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar personas" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o alcance" value={query} />
          </div>
          <Select onValueChange={(value) => setStatus((value ?? "ALL") as "ALL" | AccessStatus)} value={status}>
            <SelectTrigger aria-label="Filtrar por estado" className="w-full"><SelectValue>{status === "ALL" ? "Todos los estados" : statusLabels[status]}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Todos los estados</SelectItem><SelectItem value="PENDING">Pendientes</SelectItem><SelectItem value="ACTIVE">Activos</SelectItem><SelectItem value="SUSPENDED">Suspendidos</SelectItem></SelectContent>
          </Select>
          <Button disabled={!activeFilterCount} onClick={() => { setQuery(""); setStatus("ALL"); }} variant="ghost"><FilterXIcon /> Limpiar</Button>
        </FilterBar>
      </OperationalToolbar>

      <Card className="card-enterprise mt-5">
        <CardContent className="p-2 sm:p-3">
          <div className="divide-y divide-border-subtle">
            {filteredMembers.map((member) => {
              const accessStatus = member.accessStatus ?? "ACTIVE";
              return (
                <button className="group flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60 sm:px-3" key={member.id} onClick={() => setSelectedId(member.id)} type="button">
                  <Avatar className="size-9"><AvatarFallback>{initials(member.name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <Badge className={statusClasses[accessStatus]} variant="outline">{statusLabels[accessStatus]}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="hidden min-w-0 flex-1 md:block">
                    <p className="truncate text-xs font-medium">{member.assignments?.map((assignment) => assignment.roleName).join(", ") || "Sin rol"}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.assignments?.map((assignment) => assignment.scopeLabel).join(" · ") || member.scope || "Sin alcance"}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-medium">{member.activities} próximas</p>
                    <p className="text-xs text-muted-foreground">{member.nextAbsence ? `Ausencia ${member.nextAbsence}` : "Disponible"}</p>
                  </div>
                  <UserRoundIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
              );
            })}
            {!filteredMembers.length ? <p className="py-10 text-center text-sm text-muted-foreground">No hay usuarios que coincidan con los filtros.</p> : null}
          </div>
        </CardContent>
      </Card>

      <ResponsiveSheet
        description={selectedMember?.email}
        eyebrow="Usuario"
        heading={selectedMember?.name}
        metadata={selectedMember ? <div className="mt-3 flex flex-wrap gap-2"><Badge className={statusClasses[selectedMember.accessStatus ?? "ACTIVE"]} variant="outline">{statusLabels[selectedMember.accessStatus ?? "ACTIVE"]}</Badge><Badge variant="outline">{selectedMember.hasLocalCredential ? "Cuenta local" : selectedMember.hasZohoAccount ? "Cuenta Zoho" : "Zoho pendiente"}</Badge></div> : null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        open={Boolean(selectedMember)}
        title="Detalle de usuario"
      >
        {selectedMember ? <MemberDetail key={selectedMember.id} member={selectedMember} model={workspace} onConfirm={setConfirmation} onEdit={(member) => { setSelectedId(null); setManagedEditor({ member }); }} /> : null}
      </ResponsiveSheet>

      {workspace.isGlobalAdmin && managedEditor ? (
        <ManagedUserSheet
          key={managedEditor.member?.id ?? "new"}
          member={managedEditor?.member ? {
            assignments: managedEditor.member.assignments,
            email: managedEditor.member.email,
            hasZohoAccount: Boolean(managedEditor.member.hasZohoAccount),
            id: managedEditor.member.id,
            name: managedEditor.member.name,
          } : undefined}
          model={workspace}
          onOpenChange={(open) => !open && setManagedEditor(null)}
          onSaved={() => router.refresh()}
          open={Boolean(managedEditor)}
        />
      ) : null}

      <ConfirmActionDialog confirmLabel={confirmation?.confirmLabel} description={confirmation?.description ?? ""} destructive={confirmation?.destructive} onConfirm={executeConfirmation} onOpenChange={(open) => !open && setConfirmation(null)} open={Boolean(confirmation) && !pending} title={confirmation?.title ?? "Confirmar cambio"} />
    </PageContainer>
  );
}
