import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { AccessStatus, PrismaClient, ScopeType } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  seedActivityStatuses,
  seedActivityTypes,
  seedAdminUser,
  seedCountries,
  seedPermissions,
  seedPriorities,
  seedRolePermissions,
  seedRoles,
  seedTeams,
} from "./seed-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });

async function main() {
  await prisma.$transaction([
    ...seedRoles.map((role) =>
      prisma.role.upsert({
        where: { key: role.key },
        create: role,
        update: {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          priority: role.priority,
        },
      }),
    ),
    ...seedPermissions.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        create: permission,
        update: {
          label: permission.label,
          category: permission.category,
        },
      }),
    ),
    ...seedActivityTypes.map((item) => prisma.activityType.upsert({ where: { code: item.code }, create: item, update: item })),
    ...seedActivityStatuses.map((item) => prisma.activityStatus.upsert({ where: { code: item.code }, create: item, update: item })),
    ...seedPriorities.map((item) => prisma.priority.upsert({ where: { code: item.code }, create: item, update: item })),
  ]);

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({ select: { id: true, key: true } }),
    prisma.permission.findMany({ select: { id: true, key: true } }),
  ]);
  const roleByKey = new Map(roles.map((role) => [role.key, role.id]));
  const permissionByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );

  for (const [roleKey, permissionKeys] of Object.entries(seedRolePermissions)) {
    const roleId = roleByKey.get(roleKey);
    if (!roleId) throw new Error(`Seed role ${roleKey} is missing.`);
    const permissionIds = permissionKeys.map((permissionKey) => {
      const permissionId = permissionByKey.get(permissionKey);
      if (!permissionId)
        throw new Error(`Seed permission ${permissionKey} is missing.`);
      return permissionId;
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: { notIn: permissionIds } },
      }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  }

  const countries = await Promise.all(seedCountries.map((country) => prisma.country.upsert({
    where: { code: country.code },
    create: country,
    update: { name: country.name },
  })));
  const countryByCode = new Map(countries.map((country) => [country.code, country.id]));

  await Promise.all(seedTeams.map((team) => {
    const countryId = countryByCode.get(team.countryCode);
    if (!countryId) throw new Error(`Seed country ${team.countryCode} is missing.`);

    return prisma.team.upsert({
      where: { countryId_name: { countryId, name: team.name } },
      create: { countryId, name: team.name },
      update: {},
    });
  }));

  const administrator = await prisma.user.upsert({
    where: { email: seedAdminUser.email },
    create: { email: seedAdminUser.email, name: seedAdminUser.name, accessStatus: AccessStatus.ACTIVE },
    update: { name: seedAdminUser.name, accessStatus: AccessStatus.ACTIVE },
  });
  const seedAdminPassword = process.env[seedAdminUser.passwordEnvironmentVariable];
  if (seedAdminPassword) {
    if (seedAdminPassword.length < 12) {
      throw new Error(`${seedAdminUser.passwordEnvironmentVariable} must contain at least 12 characters.`);
    }

    await prisma.userCredential.upsert({
      where: { userId: administrator.id },
      create: {
        userId: administrator.id,
        passwordHash: await bcrypt.hash(seedAdminPassword, 12),
        mustChangePassword: false,
      },
      update: {},
    });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: seedAdminUser.roleKey } });
  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId_scopeKey: {
        userId: administrator.id,
        roleId: adminRole.id,
        scopeKey: "GLOBAL",
      },
    },
    update: {},
    create: {
      userId: administrator.id,
      roleId: adminRole.id,
      scopeType: ScopeType.GLOBAL,
      scopeKey: "GLOBAL",
      createdById: administrator.id,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
