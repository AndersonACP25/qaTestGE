import { describe, expect, it } from "vitest";
import { resolveTheme, validateDemoAccess } from "../../src/Session";

describe("demo access", () => {
  it("accepts arbitrary users without account lookup", () => {
    expect(validateDemoAccess("cualquier usuario", "123")).toBe("");
    expect(validateDemoAccess("nuevo", "prueba", "prueba")).toBe("");
  });
  it("rejects empty values and mismatched registration passwords", () => {
    expect(validateDemoAccess("  ", "123")).not.toBe("");
    expect(validateDemoAccess("demo", "  ")).not.toBe("");
    expect(validateDemoAccess("demo", "abc", "xyz")).toBe("Las contraseñas no coinciden.");
  });
});

describe("theme preference", () => {
  it("keeps an explicit preference over the system theme", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("uses the system when storage is missing or invalid", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("unknown", false)).toBe("light");
  });
});
