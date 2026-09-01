"use server";

import { revalidatePath } from "next/cache";

import { assignUserRole, setManagedUserStatus } from "@/app/actions/authorization";
import { getCurrentUser } from "@/lib/auth";
import { requireAdministrationAccess } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import {
  countryInputSchema,
  customerDeleteInputSchema,
  customerInputSchema,
  customerLocationInputSchema,
  customerLocationReorderInputSchema,
  customerLocationStatusInputSchema,
  customerLocationUpdateInputSchema,
  customerStatusInputSchema,
  teamDeleteInputSchema,
  teamInputSchema,
  teamUpdateInputSchema,
  type CustomerInput,
  type CustomerDeleteInput,
  type CustomerStatusInput,
  type CustomerLocationInput,
  type CustomerLocationReorderInput,
  type CustomerLocationStatusInput,
  type CustomerLocationUpdateInput,
  type CountryInput,
  type TeamDeleteInput,
  type TeamInput,
  type TeamUpdateInput,
  type UserAccessInput,
  type UserAccessStatusInput,
} from "@/lib/validations/administration";

type AdministrationActionResult =
  | { success: true; countryId?: string; teamId?: string; customerId?: string }
  | { success: false; errorCode: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "UNEXPECTED" };

function revalidateAdministration() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

function toActionError(error: unknown): Extract<AdministrationActionResult, { success: false }> {
  if (error instanceof Error && error.message === "FORBIDDEN") return { success: false, errorCode: "FORBIDDEN" };
  if (error instanceof Error && error.message === "NOT_FOUND") return { success: false, errorCode: "NOT_FOUND" };
  if (error instanceof Error && error.message === "CONFLICT") return { success: false, errorCode: "CONFLICT" };
  if (typeof error === "object" && error && "code" in error && error.code === "P2025") return { success: false, errorCode: "NOT_FOUND" };
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { success: false, errorCode: "CONFLICT" };
  return { success: false, errorCode: "UNEXPECTED" };
}

async function getAdministrator() {
  const user = await getCurrentUser();
  if (!user) return null;

  await requireAdministrationAccess(user.id);
  return user;
}

export async function createCountry(input: CountryInput): Promise<AdministrationActionResult> {
  const parsedInput = countryInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };

    const country = await getPrisma().$transaction(async (transaction) => {
      const createdCountry = await transaction.country.create({ data: parsedInput.data });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.id,
          entityType: "Country",
          entityId: createdCountry.id,
          action: "CREATE_COUNTRY",
        },
      });
      return createdCountry;
    });

    revalidateAdministration();
    return { success: true, countryId: country.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTeam(input: TeamInput): Promise<AdministrationActionResult> {
  const parsedInput = teamInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };

    const team = await getPrisma().$transaction(async (transaction) => {
      const country = await transaction.country.findUnique({ where: { id: parsedInput.data.countryId }, select: { id: true } });
      if (!country) throw new Error("NOT_FOUND");

      const createdTeam = await transaction.team.create({ data: parsedInput.data });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.id,
          entityType: "Team",
          entityId: createdTeam.id,
          action: "CREATE_TEAM",
        },
      });
      return createdTeam;
    });

    revalidateAdministration();
    return { success: true, teamId: team.id };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { success: false, errorCode: "NOT_FOUND" };
    return toActionError(error);
  }
}

export async function updateTeam(input: TeamUpdateInput): Promise<AdministrationActionResult> {
  const parsedInput = teamUpdateInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };

    const team = await getPrisma().$transaction(async (transaction) => {
      const [country, existingTeam] = await Promise.all([
        transaction.country.findUnique({ where: { id: parsedInput.data.countryId }, select: { id: true } }),
        transaction.team.findUnique({ where: { id: parsedInput.data.teamId }, select: { id: true } }),
      ]);
      if (!country || !existingTeam) throw new Error("NOT_FOUND");

      const updatedTeam = await transaction.team.update({
        where: { id: parsedInput.data.teamId },
        data: { countryId: parsedInput.data.countryId, name: parsedInput.data.name },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.id,
          entityType: "Team",
          entityId: updatedTeam.id,
          action: "UPDATE_TEAM",
        },
      });
      return updatedTeam;
    });

    revalidateAdministration();
    return { success: true, teamId: team.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTeam(input: TeamDeleteInput): Promise<AdministrationActionResult> {
  const parsedInput = teamDeleteInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };

    const team = await getPrisma().$transaction(async (transaction) => {
      const existingTeam = await transaction.team.findUnique({
        where: { id: parsedInput.data.teamId },
        select: { id: true },
      });
      if (!existingTeam) throw new Error("NOT_FOUND");

      // Remove access references and preserve historical activities without the deleted team.
      await transaction.userRoleAssignment.deleteMany({ where: { teamId: parsedInput.data.teamId } });
      await transaction.userPermissionOverride.deleteMany({ where: { teamId: parsedInput.data.teamId } });
      await transaction.activity.updateMany({
        where: { teamId: parsedInput.data.teamId },
        data: { teamId: null },
      });
      const deletedTeam = await transaction.team.delete({ where: { id: parsedInput.data.teamId } });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.id,
          entityType: "Team",
          entityId: deletedTeam.id,
          action: "DELETE_TEAM",
        },
      });
      return deletedTeam;
    });

    revalidateAdministration();
    return { success: true, teamId: team.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCustomer(input: CustomerInput): Promise<AdministrationActionResult> {
  const parsedInput = customerInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const customer = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.customer.create({
        data: { ...parsedInput.data, code: parsedInput.data.code || null },
      });
      await transaction.auditLog.create({
        data: { actorId: administrator.id, entityType: "Customer", entityId: created.id, action: "CREATE_CUSTOMER" },
      });
      return created;
    });
    revalidateAdministration();
    return { success: true, customerId: customer.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCustomer(input: CustomerInput & { customerId: string }): Promise<AdministrationActionResult> {
  const parsedInput = customerInputSchema.and(customerStatusInputSchema.pick({ customerId: true })).safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const customer = await getPrisma().$transaction(async (transaction) => {
      const updated = await transaction.customer.update({
        where: { id: parsedInput.data.customerId },
        data: { name: parsedInput.data.name, code: parsedInput.data.code || null },
      });
      await transaction.auditLog.create({
        data: { actorId: administrator.id, entityType: "Customer", entityId: updated.id, action: "UPDATE_CUSTOMER" },
      });
      return updated;
    });
    revalidateAdministration();
    return { success: true, customerId: customer.id };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return { success: false, errorCode: "NOT_FOUND" };
    return toActionError(error);
  }
}

export async function setCustomerStatus(input: CustomerStatusInput): Promise<AdministrationActionResult> {
  const parsedInput = customerStatusInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const customer = await getPrisma().$transaction(async (transaction) => {
      const updated = await transaction.customer.update({ where: { id: parsedInput.data.customerId }, data: { isActive: parsedInput.data.isActive } });
      await transaction.auditLog.create({
        data: { actorId: administrator.id, entityType: "Customer", entityId: updated.id, action: parsedInput.data.isActive ? "ACTIVATE_CUSTOMER" : "DEACTIVATE_CUSTOMER" },
      });
      return updated;
    });
    revalidateAdministration();
    return { success: true, customerId: customer.id };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2025") return { success: false, errorCode: "NOT_FOUND" };
    return toActionError(error);
  }
}

export async function deleteCustomer(input: CustomerDeleteInput): Promise<AdministrationActionResult> {
  const parsedInput = customerDeleteInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };

  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };

    const customer = await getPrisma().$transaction(async (transaction) => {
      const existingCustomer = await transaction.customer.findUnique({
        where: { id: parsedInput.data.customerId },
        select: { id: true },
      });
      if (!existingCustomer) throw new Error("NOT_FOUND");
      const workLogCount = typeof transaction.workLog?.count === "function"
        ? await transaction.workLog.count({ where: { customerId: existingCustomer.id } })
        : 0;
      if (workLogCount > 0) throw new Error("CONFLICT");

      // Keep activities and remove only their optional customer reference.
      await transaction.activity.updateMany({
        where: { customerId: parsedInput.data.customerId },
        data: { customerId: null },
      });
      const deletedCustomer = await transaction.customer.delete({
        where: { id: parsedInput.data.customerId },
      });
      await transaction.auditLog.create({
        data: {
          actorId: administrator.id,
          entityType: "Customer",
          entityId: deletedCustomer.id,
          action: "DELETE_CUSTOMER",
        },
      });
      return deletedCustomer;
    });

    revalidateAdministration();
    return { success: true, customerId: customer.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCustomerLocation(input: CustomerLocationInput): Promise<AdministrationActionResult> {
  const parsedInput = customerLocationInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const location = await getPrisma().$transaction(async (transaction) => {
      const customer = await transaction.customer.findUnique({ where: { id: parsedInput.data.customerId }, select: { id: true } });
      if (!customer) throw new Error("NOT_FOUND");
      const last = await transaction.customerLocation.findFirst({ where: { customerId: customer.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      const created = await transaction.customerLocation.create({ data: { customerId: customer.id, name: parsedInput.data.name, sortOrder: (last?.sortOrder ?? -1) + 1 } });
      await transaction.auditLog.create({ data: { actorId: administrator.id, entityType: "CustomerLocation", entityId: created.id, action: "CREATE_CUSTOMER_LOCATION", metadata: { customerId: customer.id } } });
      return created;
    });
    revalidateAdministration();
    return { success: true, customerId: location.customerId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCustomerLocation(input: CustomerLocationUpdateInput): Promise<AdministrationActionResult> {
  const parsedInput = customerLocationUpdateInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.customerLocation.findUnique({ where: { id: parsedInput.data.locationId }, select: { id: true, customerId: true } });
      if (!existing || existing.customerId !== parsedInput.data.customerId) throw new Error("NOT_FOUND");
      await transaction.customerLocation.update({ where: { id: existing.id }, data: { name: parsedInput.data.name } });
      await transaction.auditLog.create({ data: { actorId: administrator.id, entityType: "CustomerLocation", entityId: existing.id, action: "UPDATE_CUSTOMER_LOCATION" } });
    });
    revalidateAdministration();
    return { success: true, customerId: parsedInput.data.customerId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCustomerLocationStatus(input: CustomerLocationStatusInput): Promise<AdministrationActionResult> {
  const parsedInput = customerLocationStatusInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    const location = await getPrisma().$transaction(async (transaction) => {
      const updated = await transaction.customerLocation.update({ where: { id: parsedInput.data.locationId }, data: { isActive: parsedInput.data.isActive } });
      await transaction.auditLog.create({ data: { actorId: administrator.id, entityType: "CustomerLocation", entityId: updated.id, action: parsedInput.data.isActive ? "ACTIVATE_CUSTOMER_LOCATION" : "DEACTIVATE_CUSTOMER_LOCATION" } });
      return updated;
    });
    revalidateAdministration();
    return { success: true, customerId: location.customerId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderCustomerLocations(input: CustomerLocationReorderInput): Promise<AdministrationActionResult> {
  const parsedInput = customerLocationReorderInputSchema.safeParse(input);
  if (!parsedInput.success) return { success: false, errorCode: "VALIDATION" };
  try {
    const administrator = await getAdministrator();
    if (!administrator) return { success: false, errorCode: "UNAUTHORIZED" };
    await getPrisma().$transaction(async (transaction) => {
      const locations = await transaction.customerLocation.findMany({ where: { customerId: parsedInput.data.customerId }, select: { id: true } });
      if (locations.length !== parsedInput.data.locationIds.length || locations.some(({ id }) => !parsedInput.data.locationIds.includes(id))) throw new Error("CONFLICT");
      await Promise.all(parsedInput.data.locationIds.map((locationId, sortOrder) => transaction.customerLocation.update({ where: { id: locationId }, data: { sortOrder } })));
      await transaction.auditLog.create({ data: { actorId: administrator.id, entityType: "Customer", entityId: parsedInput.data.customerId, action: "REORDER_CUSTOMER_LOCATIONS" } });
    });
    revalidateAdministration();
    return { success: true, customerId: parsedInput.data.customerId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAccess(input: UserAccessInput): Promise<AdministrationActionResult> {
  return assignUserRole(input);
}

export async function setUserAccessStatus(input: UserAccessStatusInput): Promise<AdministrationActionResult> {
  return setManagedUserStatus(input);
}
