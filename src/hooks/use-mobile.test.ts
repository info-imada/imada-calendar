import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hookPath = resolve(import.meta.dirname, "use-mobile.ts");
const mobileHook = readFileSync(hookPath, "utf8");

describe("useIsMobile", () => {
  it("subscribes to media queries without synchronously setting state in an effect", () => {
    expect(mobileHook).toContain("React.useSyncExternalStore(");
    expect(mobileHook).not.toContain("React.useEffect(");
    expect(mobileHook).not.toContain("setIsMobile(");
  });
});
