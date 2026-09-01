import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Zoho login logo", () => {
  it("uses a horizontal viewport without square whitespace around the artwork", () => {
    const svg = readFileSync(join(process.cwd(), "public", "zoho-svgrepo-com.svg"), "utf8");
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);

    expect(viewBox).toHaveLength(4);
    if (!viewBox) throw new Error("El SVG de Zoho debe declarar un viewBox");
    expect(viewBox[2] / viewBox[3]).toBeGreaterThan(2.5);
    expect(svg).toContain('width="512"');
    expect(svg).toContain('height="177"');
  });
});
