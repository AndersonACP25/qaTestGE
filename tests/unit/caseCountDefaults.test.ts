import { describe, expect, it } from "vitest";
import { categories } from "../../src/models/caseDesign.model";
import { defaultCaseCountDefaults, loadCaseCountDefaults, saveCaseCountDefaults } from "../../src/models/caseCountDefaults";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("case count default preferences", () => {
  it("uses defaults for missing, malformed or out-of-range preferences", () => {
    const storage = createStorage({
      "qatestge-case-count-defaults-v1:user-1": JSON.stringify({ api: 3, edge: 0, unknown: 2 }),
    });
    const loaded = loadCaseCountDefaults("user-1", storage);
    expect(loaded.api).toBe(3);
    expect(loaded.edge).toBe(1);
    expect(loaded.smoke).toBe(1);
    expect(Object.keys(loaded)).toHaveLength(categories.length);
  });

  it("saves preferences under the current user and reloads them", () => {
    const storage = createStorage();
    const updated = { ...defaultCaseCountDefaults, api: 2, ui: 3 };
    saveCaseCountDefaults("user-2", updated, storage);
    expect(loadCaseCountDefaults("user-2", storage)).toEqual(updated);
    expect(loadCaseCountDefaults("another-user", storage)).toEqual(defaultCaseCountDefaults);
  });

  it("rejects invalid default quantities instead of persisting them", () => {
    const storage = createStorage();
    expect(() => saveCaseCountDefaults("user-3", { ...defaultCaseCountDefaults, api: 4 }, storage)).toThrow(RangeError);
    expect(loadCaseCountDefaults("user-3", storage)).toEqual(defaultCaseCountDefaults);
  });
});
