import { describe, expect, it } from "vitest";
import { resolveTheme, validateAccess } from "../../src/Session";

describe("access validation", () => {
  it("validates form fields without authenticating locally", () => {
    expect(validateAccess("qa@example.test", "123")).toBe("");
    expect(validateAccess("qa@example.test", "a long passphrase", "a long passphrase")).toBe("");
  });
  it("rejects empty values and mismatched registration passwords", () => {
    expect(validateAccess("  ", "123")).not.toBe("");
    expect(validateAccess("demo", "")).not.toBe("");
    expect(validateAccess("demo", "a long passphrase", "different passphrase")).toBe(
      "Las contraseñas no coinciden.",
    );
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
