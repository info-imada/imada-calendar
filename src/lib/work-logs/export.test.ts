import { describe, expect, it } from "vitest";

import { buildWorkLogExcel } from "@/lib/work-logs/export";

describe("work log export", () => {
  it("creates a non-empty XLSX with the agreed columns", async () => {
    const bytes = await buildWorkLogExcel([]);
    expect(bytes.slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    expect(bytes.byteLength).toBeGreaterThan(100);
  });
});
