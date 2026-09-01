import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireAdministrationAccess: vi.fn(),
  countryCreate: vi.fn(),
  countryFindUnique: vi.fn(),
  teamFindUnique: vi.fn(),
  teamUpdate: vi.fn(),
  teamDelete: vi.fn(),
  teamAssignmentDeleteMany: vi.fn(),
  teamOverrideDeleteMany: vi.fn(),
  activityUpdateMany: vi.fn(),
  customerDelete: vi.fn(),
  customerFindUnique: vi.fn(),
  auditCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions", () => ({ requireAdministrationAccess: mocks.requireAdministrationAccess }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: async (callback: (transaction: unknown) => unknown) => callback({
      country: { create: mocks.countryCreate, findUnique: mocks.countryFindUnique },
      team: {
        findUnique: mocks.teamFindUnique,
        update: mocks.teamUpdate,
        delete: mocks.teamDelete,
      },
      userRoleAssignment: { deleteMany: mocks.teamAssignmentDeleteMany },
      userPermissionOverride: { deleteMany: mocks.teamOverrideDeleteMany },
      activity: {
        updateMany: mocks.activityUpdateMany,
      },
      customer: { findUnique: mocks.customerFindUnique, delete: mocks.customerDelete },
      auditLog: { create: mocks.auditCreate },
    }),
  }),
}));

import { createCountry, deleteCustomer, deleteTeam, updateTeam } from "@/app/actions/administration";

describe("createCountry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "cmrl0x4sa000180o3h9q67awx" });
    mocks.countryCreate.mockResolvedValue({ id: "cmrl0x4sa000380o3h9q67awx" });
  });

  it("creates and audits a validated country for an administrator", async () => {
    await expect(createCountry({ code: "PA", name: "Panamá" })).resolves.toEqual({
      success: true,
      countryId: "cmrl0x4sa000380o3h9q67awx",
    });
    expect(mocks.requireAdministrationAccess).toHaveBeenCalledWith("cmrl0x4sa000180o3h9q67awx");
    expect(mocks.countryCreate).toHaveBeenCalledWith({ data: { code: "PA", name: "Panamá" } });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CREATE_COUNTRY" }) }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("updates and audits a team", async () => {
    mocks.countryFindUnique.mockResolvedValue({ id: "cmrl0x4sa000580o3h9q67awx" });
    mocks.teamFindUnique.mockResolvedValue({ id: "cmrl0x4sa000480o3h9q67awx" });
    mocks.teamUpdate.mockResolvedValue({ id: "cmrl0x4sa000480o3h9q67awx" });

    await expect(updateTeam({
      teamId: "cmrl0x4sa000480o3h9q67awx",
      countryId: "cmrl0x4sa000580o3h9q67awx",
      name: "Soporte México",
    })).resolves.toEqual({ success: true, teamId: "cmrl0x4sa000480o3h9q67awx" });

    expect(mocks.teamUpdate).toHaveBeenCalledWith({
      where: { id: "cmrl0x4sa000480o3h9q67awx" },
      data: { countryId: "cmrl0x4sa000580o3h9q67awx", name: "Soporte México" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE_TEAM" }) }));
  });

  it("deletes a team and unlinks every dependent reference", async () => {
    mocks.teamFindUnique.mockResolvedValue({ id: "cmrl0x4sa000480o3h9q67awx" });
    mocks.teamDelete.mockResolvedValue({ id: "cmrl0x4sa000480o3h9q67awx" });

    await expect(deleteTeam({ teamId: "cmrl0x4sa000480o3h9q67awx" })).resolves.toEqual({
      success: true,
      teamId: "cmrl0x4sa000480o3h9q67awx",
    });

    expect(mocks.teamAssignmentDeleteMany).toHaveBeenCalledWith({ where: { teamId: "cmrl0x4sa000480o3h9q67awx" } });
    expect(mocks.teamOverrideDeleteMany).toHaveBeenCalledWith({ where: { teamId: "cmrl0x4sa000480o3h9q67awx" } });
    expect(mocks.activityUpdateMany).toHaveBeenCalledWith({
      where: { teamId: "cmrl0x4sa000480o3h9q67awx" },
      data: { teamId: null },
    });
    expect(mocks.teamDelete).toHaveBeenCalledWith({ where: { id: "cmrl0x4sa000480o3h9q67awx" } });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "DELETE_TEAM" }) }));
  });

  it("deletes a customer while preserving activities without the customer reference", async () => {
    mocks.customerFindUnique.mockResolvedValue({ id: "cmrl0x4sa000680o3h9q67awx" });
    mocks.customerDelete.mockResolvedValue({ id: "cmrl0x4sa000680o3h9q67awx" });

    await expect(deleteCustomer({ customerId: "cmrl0x4sa000680o3h9q67awx" })).resolves.toEqual({
      success: true,
      customerId: "cmrl0x4sa000680o3h9q67awx",
    });

    expect(mocks.customerDelete).toHaveBeenCalledWith({ where: { id: "cmrl0x4sa000680o3h9q67awx" } });
    expect(mocks.activityUpdateMany).toHaveBeenCalledWith({
      where: { customerId: "cmrl0x4sa000680o3h9q67awx" },
      data: { customerId: null },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "DELETE_CUSTOMER" }) }));
  });
});
