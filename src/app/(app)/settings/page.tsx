import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AdministrationPage,
  type AdministrationModel,
} from "@/features/administration/administration-page";
import { getCurrentUser } from "@/lib/auth";
import { requireAdministrationAccess } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return (
      <main className="page-shell">
        <Alert>
          <AlertTitle>Acceso no disponible</AlertTitle>
          <AlertDescription>Tu sesión no tiene permisos de administración.</AlertDescription>
        </Alert>
      </main>
    );
  }
  try {
    await requireAdministrationAccess(currentUser.id);
  } catch {
    return (
      <main className="page-shell">
        <Alert>
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>Necesitas un rol de administrador global.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const prisma = getPrisma();
  const [countries, customers, roles, permissions, actorAssignment] = await Promise.all([
    prisma.country.findMany({
      include: {
        teams: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, isActive: true, locations: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } } },
    }),
    prisma.role.findMany({
      include: { permissions: { select: { permissionId: true } } },
      orderBy: { priority: "desc" },
    }),
    prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { label: "asc" }],
    }),
    prisma.userRoleAssignment.findFirst({
      where: { userId: currentUser.id, scopeType: "GLOBAL" },
      orderBy: { role: { priority: "desc" } },
      select: { role: { select: { priority: true } } },
    }),
  ]);

  const model: AdministrationModel = {
    actorPriority: actorAssignment?.role.priority ?? 0,
    countries,
    customers,
    permissions,
    roles: roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      priority: role.priority,
      permissionIds: role.permissions.map(({ permissionId }) => permissionId),
    })),
  };

  return <AdministrationPage model={model} />;
}
