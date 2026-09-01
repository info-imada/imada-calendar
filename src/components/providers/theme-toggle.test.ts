import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentPath = resolve(import.meta.dirname, "theme-toggle.tsx");
const themeToggle = readFileSync(componentPath, "utf8");

describe("ThemeToggle", () => {
  it("waits for client mounting before reading the persisted theme", () => {
    expect(themeToggle).toContain('import { useSyncExternalStore } from "react"');
    expect(themeToggle).toContain("const mounted = useSyncExternalStore(");
    expect(themeToggle).toContain("const isDark = !mounted || resolvedTheme !== \"light\"");
  });
});
