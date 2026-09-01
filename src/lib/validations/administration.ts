import { z } from "zod";

const cuid = z.string().cuid();

export const countryInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,3}$/),
  name: z.string().trim().min(2).max(80),
});

export const teamInputSchema = z.object({
  countryId: cuid,
  name: z.string().trim().min(2).max(120),
});

export const teamUpdateInputSchema = teamInputSchema.extend({
  teamId: cuid,
});

export const teamDeleteInputSchema = z.object({ teamId: cuid });

export const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().toUpperCase().max(40).optional(),
});

export const customerStatusInputSchema = z.object({
  customerId: cuid,
  isActive: z.boolean(),
});

export const customerDeleteInputSchema = z.object({ customerId: cuid });

export const customerLocationInputSchema = z.object({
  customerId: cuid,
  name: z.string().trim().min(1).max(160),
});

export const customerLocationUpdateInputSchema = customerLocationInputSchema.extend({ locationId: cuid });
export const customerLocationStatusInputSchema = z.object({ locationId: cuid, isActive: z.boolean() });
export const customerLocationReorderInputSchema = z.object({ customerId: cuid, locationIds: z.array(cuid).max(500) });

const accessAssignmentBase = {
  userId: cuid,
  roleId: cuid,
};

export const userAccessInputSchema = z.discriminatedUnion("scopeType", [
  z.object({ ...accessAssignmentBase, scopeType: z.literal("GLOBAL") }),
  z.object({
    ...accessAssignmentBase,
    scopeType: z.literal("COUNTRY"),
    countryId: cuid,
  }),
  z.object({
    ...accessAssignmentBase,
    scopeType: z.literal("TEAM"),
    teamId: cuid,
  }),
]);

export const userAccessStatusInputSchema = z.object({
  userId: cuid,
  accessStatus: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
});

export const roleCreateInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{2,39}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  priority: z.number().int().min(1).max(999),
});

export const roleUpdateInputSchema = roleCreateInputSchema.extend({
  roleId: cuid,
});

export const roleDeleteInputSchema = z.object({ roleId: cuid });

export const rolePermissionInputSchema = z.object({
  roleId: cuid,
  permissionId: cuid,
  enabled: z.boolean(),
});

const permissionOverrideBase = {
  userId: cuid,
  permissionId: cuid,
  effect: z.enum(["GRANT", "DENY"]),
};

export const permissionOverrideInputSchema = z.discriminatedUnion(
  "scopeType",
  [
    z.object({ ...permissionOverrideBase, scopeType: z.literal("GLOBAL") }),
    z.object({
      ...permissionOverrideBase,
      scopeType: z.literal("COUNTRY"),
      countryId: cuid,
    }),
    z.object({
      ...permissionOverrideBase,
      scopeType: z.literal("TEAM"),
      teamId: cuid,
    }),
  ],
);

export const permissionOverrideDeleteInputSchema = z.object({
  overrideId: cuid,
});

export const userRoleAssignmentDeleteInputSchema = z.object({
  assignmentId: cuid,
});

export const temporaryPasswordResetInputSchema = z.object({ userId: cuid });

const managedUserCreateBase = {
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  authMethod: z.enum(["ZOHO", "LOCAL"]),
  accessStatus: z.enum(["PENDING", "ACTIVE"]),
  roleId: cuid,
};

export const managedUserCreateInputSchema = z.discriminatedUnion("scopeType", [
  z.object({ ...managedUserCreateBase, scopeType: z.literal("GLOBAL") }),
  z.object({
    ...managedUserCreateBase,
    scopeType: z.literal("COUNTRY"),
    countryId: cuid,
  }),
  z.object({
    ...managedUserCreateBase,
    scopeType: z.literal("TEAM"),
    teamId: cuid,
  }),
]);

export const managedUserUpdateInputSchema = z
  .object({
    userId: cuid,
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    assignmentId: cuid.optional(),
    roleId: cuid.optional(),
    scopeType: z.enum(["GLOBAL", "COUNTRY", "TEAM"]).optional(),
    countryId: cuid.optional(),
    teamId: cuid.optional(),
  })
  .superRefine((value, context) => {
    const hasAccessFields = Boolean(
      value.assignmentId || value.roleId || value.scopeType || value.countryId || value.teamId,
    );
    if (!hasAccessFields) return;
    if (!value.roleId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["roleId"], message: "El rol es obligatorio al editar el acceso." });
    }
    if (!value.scopeType) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["scopeType"], message: "El alcance es obligatorio al cambiar el rol." });
      return;
    }
    if (value.scopeType === "COUNTRY" && !value.countryId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["countryId"], message: "Selecciona un país." });
    }
    if (value.scopeType === "TEAM" && !value.teamId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["teamId"], message: "Selecciona un equipo." });
    }
    if (value.scopeType !== "COUNTRY" && value.countryId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["countryId"], message: "El país no corresponde a este alcance." });
    }
    if (value.scopeType !== "TEAM" && value.teamId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["teamId"], message: "El equipo no corresponde a este alcance." });
    }
  });

export type CountryInput = z.infer<typeof countryInputSchema>;
export type TeamInput = z.infer<typeof teamInputSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateInputSchema>;
export type TeamDeleteInput = z.infer<typeof teamDeleteInputSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerStatusInput = z.infer<typeof customerStatusInputSchema>;
export type CustomerDeleteInput = z.infer<typeof customerDeleteInputSchema>;
export type CustomerLocationInput = z.infer<typeof customerLocationInputSchema>;
export type CustomerLocationUpdateInput = z.infer<typeof customerLocationUpdateInputSchema>;
export type CustomerLocationStatusInput = z.infer<typeof customerLocationStatusInputSchema>;
export type CustomerLocationReorderInput = z.infer<typeof customerLocationReorderInputSchema>;
export type UserAccessInput = z.infer<typeof userAccessInputSchema>;
export type UserAccessStatusInput = z.infer<typeof userAccessStatusInputSchema>;
export type RoleCreateInput = z.infer<typeof roleCreateInputSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateInputSchema>;
export type RoleDeleteInput = z.infer<typeof roleDeleteInputSchema>;
export type RolePermissionInput = z.infer<typeof rolePermissionInputSchema>;
export type PermissionOverrideInput = z.infer<
  typeof permissionOverrideInputSchema
>;
export type PermissionOverrideDeleteInput = z.infer<
  typeof permissionOverrideDeleteInputSchema
>;
export type UserRoleAssignmentDeleteInput = z.infer<
  typeof userRoleAssignmentDeleteInputSchema
>;
export type TemporaryPasswordResetInput = z.infer<
  typeof temporaryPasswordResetInputSchema
>;
export type ManagedUserCreateInput = z.infer<
  typeof managedUserCreateInputSchema
>;
export type ManagedUserUpdateInput = z.infer<
  typeof managedUserUpdateInputSchema
>;
