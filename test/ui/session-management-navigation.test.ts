import { beforeAll, describe, expect, it } from "vitest";

type NavigationModule = typeof import("../../ui/src/ui/navigation.ts");

let navigation: NavigationModule;

beforeAll(async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { language: "en-US" },
  });

  navigation = await import("../../ui/src/ui/navigation.ts");
});

describe("session management navigation", () => {
  it("adds session management under the chat nav group", () => {
    const chatGroup = navigation.TAB_GROUPS.find((group) => group.label === "chat");

    expect(chatGroup).toBeDefined();
    expect(chatGroup?.tabs).toContain("sessionManagement");
    expect(chatGroup?.tabs.indexOf("sessionManagement")).toBeGreaterThan(
      chatGroup?.tabs.indexOf("chat") ?? -1,
    );
  });

  it("maps the new tabs to stable routes", () => {
    expect(navigation.pathForTab("sessionManagement" as navigation.Tab)).toBe(
      "/session-management",
    );
    expect(navigation.pathForTab("historySession" as navigation.Tab)).toBe("/history-session");
    expect(navigation.tabFromPath("/session-management")).toBe("sessionManagement");
    expect(navigation.tabFromPath("/history-session")).toBe("historySession");
  });
});
