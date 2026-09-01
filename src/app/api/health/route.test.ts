import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrisma } from "@/lib/prisma";

import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when PostgreSQL is reachable", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ reachable: 1 }]);
    vi.mocked(getPrisma).mockReturnValue({ $queryRaw: queryRaw } as never);

    const response = await GET();

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns a sanitized 503 when PostgreSQL is unavailable", async () => {
    const queryRaw = vi
      .fn()
      .mockRejectedValue(
        new Error("postgresql://user:secret@internal-host/database"),
      );
    vi.mocked(getPrisma).mockReturnValue({ $queryRaw: queryRaw } as never);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
    expect(body).not.toContain("secret");
    expect(body).not.toContain("internal-host");
  });
});
