import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync("src/app/globals.css", "utf8");
const controlStyles = [
  readFileSync("src/components/ui/input.tsx", "utf8"),
  readFileSync("src/components/ui/select.tsx", "utf8"),
  readFileSync("src/components/ui/textarea.tsx", "utf8"),
].join("\n");

function themeBlock(selector: string) {
  const match = globalStyles.match(
    new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  expect(match, `Missing theme block: ${selector}`).toBeTruthy();
  return match?.[1] ?? "";
}

describe("product design token contract", () => {
  it("defines shared density, layout and touch targets", () => {
    expect(globalStyles).toContain("--content-max: 106rem");
    expect(globalStyles).toContain("--touch-target: 2.75rem");
    expect(globalStyles).toContain(".intentional-scroll");
  });

  it("provides safe mobile and reduced-motion behavior", () => {
    expect(globalStyles).toContain("env(safe-area-inset-bottom)");
    expect(globalStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the explicit next-themes contract and balanced tokens", () => {
    expect(globalStyles).toMatch(/:root,\s*\.dark\s*\{/);
    expect(globalStyles).toMatch(/\.light\s*\{/);
    expect(globalStyles).toContain("--text-page-title");
    expect(globalStyles).toContain("--stat-pill-height");
    expect(globalStyles).toContain("--input-border");
    expect(globalStyles.match(/--brand-rgb\s*:/g)?.length).toBe(2);
    expect(globalStyles.match(/--success-rgb\s*:/g)?.length).toBe(2);
    expect(globalStyles).not.toMatch(/:root:not\(\.dark\)/);
  });

  it("keeps neutral surfaces achromatic in both themes", () => {
    const dark = themeBlock(":root,\\s*\\.dark");
    const light = themeBlock("\\.light");

    for (const token of [
      "background",
      "card",
      "popover",
      "secondary",
      "muted",
      "accent",
      "surface-1",
      "surface-2",
      "surface-3",
      "surface-inset",
    ]) {
      const darkValue = dark.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
      const lightValue = light.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];

      expect(darkValue, `Missing dark --${token}`).toMatch(/^#([0-9a-f]){6}$/i);
      expect(lightValue, `Missing light --${token}`).toMatch(/^#([0-9a-f]){6}$/i);

      for (const value of [darkValue, lightValue]) {
        const [, red, green, blue] = value?.match(/^#(..)(..)(..)$/) ?? [];
        expect(red, `${token} is not neutral: ${value}`).toBe(green);
        expect(green, `${token} is not neutral: ${value}`).toBe(blue);
      }
    }
  });

  it("separates the input surface from its visible border token", () => {
    expect(globalStyles).toContain("--color-input: var(--input-border)");
    expect(globalStyles).toContain("--color-input-surface: var(--input)");
    expect(controlStyles).toContain("border-input bg-input-surface");
  });
});
