"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  Building2Icon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createCountry,
  createCustomer,
  createCustomerLocation,
  createTeam,
  deleteCustomer,
  deleteTeam,
  setCustomerStatus,
  setCustomerLocationStatus,
  updateCustomer,
  updateCustomerLocation,
  updateTeam,
} from "@/app/actions/administration";
import {
  createRole,
  setRolePermission,
  type AuthorizationActionResult,
} from "@/app/actions/authorization";
import {
  ConfirmActionDialog,
  FormSection,
  ResponsiveSheet,
} from "@/components/product/forms";
import {
  OperationalToolbar,
  PageContainer,
  PageHeader,
} from "@/components/product/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { administrationMessages } from "@/messages/common";

export type AdministrationModel = {
  actorPriority?: number;
  countries: {
    id: string;
    code: string;
    name: string;
    teams: { id: string; name: string }[];
  }[];
  customers?: {
    id: string;
    name: string;
    code: string | null;
    isActive: boolean;
    locations?: { id: string; name: string; isActive: boolean }[];
  }[];
  roles: {
    id: string;
    key: string;
    name?: string;
    description?: string | null;
    isSystem?: boolean;
    priority?: number;
    permissionIds?: string[];
  }[];
  permissions?: {
    id: string;
    key: string;
    label: string;
    category: string;
  }[];
  users?: {
    id: string;
    email: string | null;
    name: string | null;
    accessStatus: "PENDING" | "ACTIVE" | "SUSPENDED";
    assignments: {
      id: string;
      role: string;
      scopeType: string;
      scope?: string;
    }[];
  }[];
};

type PermissionConfirmation = {
  roleId: string;
  roleName: string;
  permissionId: string;
  permissionLabel: string;
  enabled: boolean;
};

function CountrySheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <PlusIcon /> {administrationMessages.countries.add}
      </Button>
      <ResponsiveSheet description="Añade un territorio disponible para equipos y actividades." onOpenChange={setOpen} open={open} title={administrationMessages.forms.createCountry}>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await createCountry({ code, name });
              if (result.success) {
                toast.success("País creado y registrado en auditoría");
                router.refresh();
                setCode("");
                setName("");
                setOpen(false);
              } else toast.error("No fue posible crear el país");
            });
          }}
        >
          <FormSection description="Usa el código ISO corto y un nombre reconocible." title="Identificación">
            <div className="space-y-2">
              <Label htmlFor="country-code">{administrationMessages.forms.code}</Label>
              <Input id="country-code" maxLength={3} name="code" onChange={(event) => setCode(event.target.value)} placeholder="Ej. PA" required value={code} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-name">{administrationMessages.forms.name}</Label>
              <Input id="country-name" name="name" onChange={(event) => setName(event.target.value)} placeholder="Ej. Panamá" required value={name} />
            </div>
          </FormSection>
          <Button disabled={pending || !code.trim() || !name.trim()} type="submit">{pending ? "Guardando…" : administrationMessages.forms.save}</Button>
        </form>
      </ResponsiveSheet>
    </>
  );
}

function TeamSheet({
  countries,
  team,
}: Pick<AdministrationModel, "countries"> & {
  team?: { id: string; name: string; countryId: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team?.name ?? "");
  const [countryId, setCountryId] = useState(team?.countryId ?? countries[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  if (!countries.length) return null;

  const isEditing = Boolean(team);
  const formKey = team?.id ?? "new";

  return (
    <>
      <Button
        aria-label={isEditing ? `Editar equipo ${team?.name}` : administrationMessages.countries.addTeam}
        className={isEditing ? "w-auto" : "w-full sm:w-auto"}
        onClick={() => setOpen(true)}
        size={isEditing ? "sm" : "default"}
        variant={isEditing ? "outline" : "outline"}
      >
        {isEditing ? <PencilIcon /> : <PlusIcon />}
        {isEditing ? "Editar" : administrationMessages.countries.addTeam}
      </Button>
      <ResponsiveSheet
        description="Vincula el equipo a un territorio operativo existente."
        onOpenChange={setOpen}
        open={open}
        title={isEditing ? "Editar equipo" : administrationMessages.forms.createTeam}
      >
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = team
                ? await updateTeam({ teamId: team.id, countryId, name })
                : await createTeam({ countryId, name });
              if (result.success) {
                toast.success(isEditing ? "Equipo actualizado" : "Equipo creado y registrado en auditoría");
                router.refresh();
                if (!isEditing) setName("");
                setOpen(false);
              } else {
                toast.error(result.errorCode === "CONFLICT" ? "Ya existe un equipo con ese nombre en el país" : "No fue posible guardar el equipo");
              }
            });
          }}
        >
          <FormSection description="Selecciona el país y usa un nombre operativo específico." title="Ubicación y nombre">
            <div className="space-y-2">
              <Label htmlFor={`team-country-${formKey}`}>{administrationMessages.forms.country}</Label>
              <Select onValueChange={(value) => setCountryId(value ?? "")} value={countryId}>
                <SelectTrigger aria-label={administrationMessages.forms.country} className="w-full" id={`team-country-${formKey}`}><SelectValue placeholder="Selecciona un país">{countries.find((country) => country.id === countryId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>{countries.map((country) => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`team-name-${formKey}`}>{administrationMessages.forms.team}</Label>
              <Input id={`team-name-${formKey}`} name="name" onChange={(event) => setName(event.target.value)} placeholder="Ej. Soporte Técnico Panamá" required value={name} />
            </div>
          </FormSection>
          <Button disabled={pending || !countryId || !name.trim()} type="submit">{pending ? "Guardando…" : isEditing ? "Guardar cambios" : administrationMessages.forms.save}</Button>
        </form>
      </ResponsiveSheet>
    </>
  );
}

function TeamDeleteButton({ team }: { team: { id: string; name: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setOpen(false);
    startTransition(async () => {
      const result = await deleteTeam({ teamId: team.id });
      if (result.success) {
        toast.success("Equipo eliminado");
        router.refresh();
      } else {
        toast.error(result.errorCode === "NOT_FOUND" ? "El equipo ya no existe" : "No fue posible eliminar el equipo");
      }
    });
  }

  return (
    <>
      <Button
        aria-label={`Eliminar equipo ${team.name}`}
        disabled={pending}
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <Trash2Icon />
        <span className="sr-only">Eliminar</span>
      </Button>
      <ConfirmActionDialog
        confirmLabel="Eliminar equipo"
        description={`Se eliminará “${team.name}” y se quitarán sus asignaciones, permisos y referencias opcionales de actividades. Esta acción no se puede deshacer.`}
        destructive
        onConfirm={confirmDelete}
        onOpenChange={setOpen}
        open={open}
        title="Eliminar equipo"
      />
    </>
  );
}

function CustomerSheet({ customer }: { customer?: NonNullable<AdministrationModel["customers"]>[number] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [code, setCode] = useState(customer?.code ?? "");
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = customer
        ? await updateCustomer({ customerId: customer.id, name, code })
        : await createCustomer({ name, code });
      if (result.success) {
        toast.success(customer ? "Cliente actualizado" : "Cliente creado");
        setOpen(false);
        router.refresh();
      } else toast.error(result.errorCode === "CONFLICT" ? "Ya existe un cliente con ese código" : "No fue posible guardar el cliente");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant={customer ? "outline" : "default"}>
        {customer ? "Editar" : <><PlusIcon /> Nuevo cliente</>}
      </Button>
      <ResponsiveSheet description="Los clientes activos aparecen al crear una actividad." onOpenChange={setOpen} open={open} title={customer ? "Editar cliente" : "Nuevo cliente"}>
        <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6" onSubmit={save}>
          <FormSection description="Usa el nombre que reconocerán técnicos y coordinadores." title="Datos del cliente">
            <div className="space-y-2"><Label htmlFor={`customer-name-${customer?.id ?? "new"}`}>Nombre</Label><Input id={`customer-name-${customer?.id ?? "new"}`} onChange={(event) => setName(event.target.value)} placeholder="Ej. Cliente industrial" required value={name} /></div>
            <div className="space-y-2"><Label htmlFor={`customer-code-${customer?.id ?? "new"}`}>Código (opcional)</Label><Input id={`customer-code-${customer?.id ?? "new"}`} onChange={(event) => setCode(event.target.value)} placeholder="Ej. CLI-001" value={code} /></div>
          </FormSection>
          <Button disabled={pending || !name.trim()} type="submit">{pending ? "Guardando…" : "Guardar cliente"}</Button>
        </form>
      </ResponsiveSheet>
    </>
  );
}

function CustomerDeleteButton({ customer }: { customer: NonNullable<AdministrationModel["customers"]>[number] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setOpen(false);
    startTransition(async () => {
      const result = await deleteCustomer({ customerId: customer.id });
      if (result.success) {
        toast.success("Cliente eliminado");
        router.refresh();
      } else {
        toast.error(result.errorCode === "NOT_FOUND" ? "El cliente ya no existe" : result.errorCode === "CONFLICT" ? "No se puede eliminar un cliente con registros históricos; desactívalo." : "No fue posible eliminar el cliente");
      }
    });
  }

  return (
    <>
      <Button
        aria-label={`Eliminar cliente ${customer.name}`}
        disabled={pending}
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
      >
        <Trash2Icon />
        <span className="sr-only">Eliminar</span>
      </Button>
      <ConfirmActionDialog
        confirmLabel="Eliminar cliente"
        description={`Se eliminará “${customer.name}” y se quitará su referencia de las actividades existentes. Esta acción no se puede deshacer.`}
        destructive
        onConfirm={confirmDelete}
        onOpenChange={setOpen}
        open={open}
        title="Eliminar cliente"
      />
    </>
  );
}

function CustomerLocationsEditor({ customer }: { customer: NonNullable<AdministrationModel["customers"]>[number] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const locations = customer.locations ?? [];

  function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createCustomerLocation({ customerId: customer.id, name });
      if (result.success) { setName(""); router.refresh(); toast.success("Ubicación añadida"); }
      else toast.error(result.errorCode === "CONFLICT" ? "Ya existe esa ubicación para el cliente" : "No fue posible añadir la ubicación");
    });
  }

  return (
    <div className="mt-3 rounded-lg bg-muted/35 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicaciones</p>
      <div className="mt-2 space-y-2">
        {locations.map((location) => <CustomerLocationRow customerId={customer.id} key={location.id} location={location} />)}
        {!locations.length ? <p className="text-xs text-muted-foreground">Sin ubicaciones registradas.</p> : null}
      </div>
      <form className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={addLocation}>
        <Input aria-label={`Nueva ubicación para ${customer.name}`} className="min-w-0 flex-1 bg-background" onChange={(event) => setName(event.target.value)} placeholder="Ej. Planta Madrid" value={name} />
        <Button disabled={pending || !name.trim()} size="sm" type="submit">Añadir</Button>
      </form>
    </div>
  );
}

function CustomerLocationRow({ customerId, location }: { customerId: string; location: { id: string; name: string; isActive: boolean } }) {
  const router = useRouter();
  const [name, setName] = useState(location.name);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== location.name;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border/70 bg-background p-2 sm:flex-row sm:items-center">
      <Input aria-label={`Nombre de ubicación ${location.name}`} className="min-w-0 flex-1" disabled={pending} onChange={(event) => setName(event.target.value)} value={name} />
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Badge variant={location.isActive ? "secondary" : "outline"}>{location.isActive ? "Activa" : "Inactiva"}</Badge>
        {dirty ? <Button disabled={pending || !name.trim()} onClick={() => startTransition(async () => { const result = await updateCustomerLocation({ locationId: location.id, customerId, name }); if (result.success) { router.refresh(); toast.success("Ubicación actualizada"); } else toast.error("No fue posible actualizar la ubicación"); })} size="sm" variant="ghost">Guardar</Button> : null}
        <Button disabled={pending} onClick={() => startTransition(async () => { const result = await setCustomerLocationStatus({ locationId: location.id, isActive: !location.isActive }); if (result.success) { router.refresh(); toast.success(location.isActive ? "Ubicación desactivada" : "Ubicación activada"); } else toast.error("No fue posible actualizar la ubicación"); })} size="sm" variant="ghost">{location.isActive ? "Desactivar" : "Activar"}</Button>
      </div>
    </div>
  );
}

function CustomerCatalog({ customers = [] }: Pick<AdministrationModel, "customers">) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  return (
    <Card className="card-enterprise">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Clientes</CardTitle><CardDescription>Catálogo usado para asociar actividades.</CardDescription></div><CustomerSheet /></CardHeader>
      <CardContent>
        {customers.length ? <div className="space-y-2">{customers.map((customer) => <div className="rounded-xl border border-border p-3" key={customer.id}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.code || "Sin código"} · {customer.isActive ? "Activo" : "Inactivo"}</p></div><div className="flex shrink-0 flex-wrap justify-end gap-2"><CustomerSheet customer={customer} /><Button disabled={pendingId === customer.id} onClick={() => { setPendingId(customer.id); void setCustomerStatus({ customerId: customer.id, isActive: !customer.isActive }).then((result) => { setPendingId(null); if (result.success) { toast.success(customer.isActive ? "Cliente desactivado" : "Cliente activado"); router.refresh(); } else toast.error("No fue posible actualizar el cliente"); }).catch(() => { setPendingId(null); toast.error("No fue posible actualizar el cliente"); }); }} size="sm" variant="ghost">{customer.isActive ? "Desactivar" : "Activar"}</Button><CustomerDeleteButton customer={customer} /></div></div><CustomerLocationsEditor customer={customer} /></div>)}</div> : <Alert><Building2Icon /><AlertTitle>No hay clientes</AlertTitle><AlertDescription>Crea el primer cliente para asociarlo a nuevas actividades.</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
}

function CreateRoleSheet({ actorPriority }: { actorPriority: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)}><PlusIcon /> Nuevo rol</Button>
      <ResponsiveSheet description="Crea un rol adicional por debajo de tu nivel de privilegio." onOpenChange={setOpen} open={open} title="Nuevo rol">
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await createRole({
                key,
                name: roleName,
                description,
                priority: Number(priority ?? 0),
              });
              if (result.success) {
                toast.success("Rol creado y auditado");
                router.refresh();
                setKey("");
                setRoleName("");
                setDescription("");
                setPriority("");
                setOpen(false);
              } else toast.error(result.errorCode === "FORBIDDEN" ? "La prioridad excede tu nivel" : "No fue posible crear el rol");
            });
          }}
        >
          <FormSection description="La clave es estable; el nombre y descripción se muestran en la interfaz." title="Identidad del rol">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="role-key">Clave</Label><Input id="role-key" name="key" onChange={(event) => setKey(event.target.value)} placeholder="Ej. SUPERVISOR_CAMPO" required value={key} /></div>
              <div className="space-y-2"><Label htmlFor="role-name">Nombre</Label><Input id="role-name" name="name" onChange={(event) => setRoleName(event.target.value)} placeholder="Ej. Supervisor de campo" required value={roleName} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="role-description">Descripción</Label><Textarea id="role-description" name="description" onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Supervisa la ejecución regional sin administrar el catálogo." value={description} /></div>
            <div className="space-y-2"><Label htmlFor="role-priority">Prioridad</Label><Input id="role-priority" max={Math.max(actorPriority - 1, 1)} min={1} name="priority" onChange={(event) => setPriority(event.target.value)} placeholder={`Ej. ${Math.max(actorPriority - 50, 1)}`} required type="number" value={priority} /><p className="text-xs text-muted-foreground">Debe ser menor que {actorPriority}.</p></div>
          </FormSection>
          <Button disabled={pending || !key.trim() || !roleName.trim() || !priority || Number(priority) < 1 || Number(priority) >= actorPriority} type="submit">{pending ? "Creando…" : "Crear rol"}</Button>
        </form>
      </ResponsiveSheet>
    </>
  );
}

function PermissionMatrix({ model }: { model: AdministrationModel }) {
  const router = useRouter();
  const permissions = useMemo(() => model.permissions ?? [], [model.permissions]);
  const [mobileRoleId, setMobileRoleId] = useState(model.roles[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState<PermissionConfirmation | null>(null);
  const [pending, startTransition] = useTransition();
  const grouped = useMemo(
    () => permissions.reduce((groups, permission) => {
      const group = groups.get(permission.category) ?? [];
      group.push(permission);
      groups.set(permission.category, group);
      return groups;
    }, new Map<string, typeof permissions>()),
    [permissions],
  );
  const mobileRole = model.roles.find((role) => role.id === mobileRoleId) ?? model.roles[0];

  function requestToggle(role: AdministrationModel["roles"][number], permission: NonNullable<AdministrationModel["permissions"]>[number], enabled: boolean) {
    setConfirmation({ roleId: role.id, roleName: role.name ?? role.key, permissionId: permission.id, permissionLabel: permission.label, enabled });
  }

  function commitToggle() {
    if (!confirmation) return;
    const input = confirmation;
    setConfirmation(null);
    startTransition(async () => {
      const result: AuthorizationActionResult = await setRolePermission({ roleId: input.roleId, permissionId: input.permissionId, enabled: input.enabled });
      if (result.success) {
        toast.success("Matriz actualizada y auditada");
        router.refresh();
      } else toast.error(result.errorCode === "FORBIDDEN" ? "No puedes conceder un permiso que no posees" : "No fue posible actualizar la matriz");
    });
  }

  if (!model.roles.length || !permissions.length) {
    return <Alert><ShieldCheckIcon /><AlertTitle>Matriz no disponible</AlertTitle><AlertDescription>Ejecuta el seed para crear roles y permisos base.</AlertDescription></Alert>;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Rol visible</Label><Select onValueChange={(value) => setMobileRoleId(value ?? "")} value={mobileRole?.id}><SelectTrigger className="w-full" aria-label="Rol de la matriz"><SelectValue>{mobileRole?.name ?? mobileRole?.key}</SelectValue></SelectTrigger><SelectContent>{model.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name ?? role.key}</SelectItem>)}</SelectContent></Select></div>
        {mobileRole ? [...grouped.entries()].map(([category, categoryPermissions]) => (
          <FormSection density="compact" key={category} title={category}>
            <div className="divide-y divide-border-subtle">
              {categoryPermissions.map((permission) => {
                const enabled = mobileRole.permissionIds?.includes(permission.id) ?? false;
                return <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2" key={permission.id}><span className="text-sm font-medium">{permission.label}</span><Checkbox aria-label={`${permission.label} para ${mobileRole.name ?? mobileRole.key}`} checked={enabled} disabled={pending} onCheckedChange={(checked) => requestToggle(mobileRole, permission, Boolean(checked))} /></label>;
              })}
            </div>
          </FormSection>
        )) : null}
      </div>

      <ConfirmActionDialog confirmLabel={confirmation?.enabled ? "Conceder permiso" : "Retirar permiso"} description={confirmation ? `${confirmation.enabled ? "Concederás" : "Retirarás"} “${confirmation.permissionLabel}” al rol ${confirmation.roleName}. El cambio afecta a todos sus usuarios.` : ""} destructive={confirmation ? !confirmation.enabled : false} onConfirm={commitToggle} onOpenChange={(open) => !open && setConfirmation(null)} open={Boolean(confirmation)} title="Confirmar cambio de permisos" />
    </>
  );
}

export function AdministrationPage({ model }: { model: AdministrationModel }) {
  const [section, setSection] = useState("catalog");

  return (
    <PageContainer>
      <PageHeader density="compact" description="Configura territorios y controla el acceso avanzado del equipo." eyebrow="Configuración" title={administrationMessages.title} />

      <Tabs className="mt-5" onValueChange={setSection} value={section}>
        <OperationalToolbar
          context={
            <div className="w-full min-w-0">
              <div className="space-y-2 sm:hidden">
                <Label htmlFor="administration-section">Sección</Label>
                <Select onValueChange={(value) => setSection(value ?? "catalog")} value={section}>
                  <SelectTrigger aria-label="Sección de administración" className="min-h-11 w-full" id="administration-section">
                    <SelectValue>{section === "catalog" ? "Territorios" : section === "customers" ? "Clientes" : "Roles y permisos"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalog">Territorios</SelectItem>
                    <SelectItem value="customers">Clientes</SelectItem>
                    <SelectItem value="permissions">Roles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <TabsList className="hidden w-full sm:flex sm:w-fit" aria-label="Vistas de administración">
                <TabsTrigger value="catalog">Territorios</TabsTrigger>
                <TabsTrigger value="customers">Clientes</TabsTrigger>
                <TabsTrigger aria-label="Roles y permisos" value="permissions">Roles</TabsTrigger>
              </TabsList>
            </div>
          }
          label="Herramientas de administración"
        />

        <TabsContent className="mt-4 space-y-4" value="catalog">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"><TeamSheet countries={model.countries} /><CountrySheet /></div>
          <Card className="card-enterprise">
            <CardHeader><CardTitle>{administrationMessages.countries.title}</CardTitle><CardDescription>Territorios y equipos disponibles para la operación.</CardDescription></CardHeader>
            <CardContent>
              {model.countries.length ? <div className="grid gap-3 md:grid-cols-2">{model.countries.map((country) => <div className="rounded-xl border border-border p-3 sm:p-4" key={country.id}><div className="flex items-center gap-3"><Building2Icon className="size-4 text-primary" /><div><p className="font-medium">{country.name}</p><p className="mono-code text-xs text-muted-foreground">{country.code}</p></div></div><div className="mt-3 space-y-2">{country.teams.length ? country.teams.map((team) => <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1.5" key={team.id}><Badge className="min-w-0 max-w-full truncate" variant="outline">{team.name}</Badge><div className="flex shrink-0 items-center gap-1"><TeamSheet countries={model.countries} team={{ ...team, countryId: country.id }} /><TeamDeleteButton team={team} /></div></div>) : <span className="text-xs text-muted-foreground">Sin equipos</span>}</div></div>)}</div> : <Alert><Building2Icon /><AlertTitle>{administrationMessages.countries.empty}</AlertTitle><AlertDescription>Crea el primer país para habilitar equipos y actividades.</AlertDescription></Alert>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="customers"><CustomerCatalog customers={model.customers ?? []} /></TabsContent>

        <TabsContent className="mt-4 space-y-4" value="permissions">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-display text-base font-semibold">Permisos por rol</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Selecciona un rol y revisa sus capacidades. Cada cambio requiere confirmación porque afecta a todos sus usuarios.</p></div><CreateRoleSheet actorPriority={model.actorPriority ?? 0} /></div>
          <PermissionMatrix model={model} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
