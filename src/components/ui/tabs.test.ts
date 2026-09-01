import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tabsSource = readFileSync(resolve(import.meta.dirname, "tabs.tsx"), "utf8");

describe("Tabs", () => {
  it("stacks the tab list above content for horizontal tabs", () => {
    expect(tabsSource).toContain("data-[orientation=horizontal]:flex-col");
    expect(tabsSource).not.toContain("data-horizontal:flex-col");
  });

  it("keeps tab labels inside the viewport on narrow screens", () => {
    expect(tabsSource).toContain("w-full flex-wrap");
    expect(tabsSource).toContain("sm:w-fit");
    expect(tabsSource).toContain("whitespace-normal");
  });
});
