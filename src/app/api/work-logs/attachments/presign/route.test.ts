import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getEffectivePermissions: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  presignWorkLogUpload: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions", () => ({ getEffectivePermissions: mocks.getEffectivePermissions }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ workLog: { findUnique: mocks.findUnique }, workLogAttachment: { count: mocks.count, create: mocks.create } }) }));
vi.mock("@/lib/storage/r2", () => ({ buildWorkLogObjectKey: () => "work-logs/log-1/upload-1/evidence.jpg", presignWorkLogUpload: mocks.presignWorkLogUpload }));

import { POST } from "@/app/api/work-logs/attachments/presign/route";

const workLogId = "cmrl0x4sa001480o3h9q67aab";

describe("work log attachment presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findUnique.mockResolvedValue({ id: workLogId, userId: "user-1", status: "IN_PROGRESS", countryId: "country-1", teamId: null });
    mocks.getEffectivePermissions.mockResolvedValue({ can: (key: string) => key === "worklog:update" });
    mocks.count.mockResolvedValue(0);
    mocks.presignWorkLogUpload.mockResolvedValue({ url: "https://upload.example/put", expiresIn: 900 });
    mocks.create.mockResolvedValue({ id: "attachment-1", uploadUuid: "upload-1", objectKey: "work-logs/log-1/upload-1/evidence.jpg" });
  });

  it("rejects a MIME/extension mismatch before contacting R2", async () => {
    const response = await POST(new Request("https://calendar.example.com/api/work-logs/attachments/presign", { method: "POST", body: JSON.stringify({ workLogId, name: "evidence.png", type: "image/jpeg", size: 100 }) }));
    expect(response.status).toBe(400);
    expect(mocks.presignWorkLogUpload).not.toHaveBeenCalled();
  });

  it("returns a direct upload URL for an owned valid attachment", async () => {
    const response = await POST(new Request("https://calendar.example.com/api/work-logs/attachments/presign", { method: "POST", body: JSON.stringify({ workLogId, name: "evidence.jpg", type: "image/jpeg", size: 100 }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ attachmentId: "attachment-1", uploadUrl: "https://upload.example/put" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", mimeType: "image/jpeg" }) }));
  });
});
