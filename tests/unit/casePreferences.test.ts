import { describe, expect, it } from "vitest";
import {
  casePreferencesKey,
  initialCasePreferences,
  loadCasePreferences,
  saveCasePreferences,
  renameCaseType,
} from "../../src/models/casePreferences";
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe("preferencias de diseño consistentes", () => {
  it("migra formatos anteriores sin escribir ni perder selecciones", () => {
    const store = storage();
    store.values.set("qatestge-custom-case-types-v1:u", '["Contratos"]');
    store.values.set("qatestge-case-count-defaults-v1:u", '{"smoke":4}');
    store.values.set("qatestge-case-design-categories-v1:u", '["smoke"]');
    const loaded = loadCasePreferences("u", store);
    expect(loaded.catalog.at(-1)?.label).toBe("Contratos");
    expect(loaded.counts.smoke).toBe(4);
    expect(loaded.selected).toEqual(["smoke"]);
    expect(store.getItem(casePreferencesKey("u"))).toBeNull();
  });
  it("edita y oculta tipos incluidos conservando IDs y cantidades", () => {
    const store = storage(),
      initial = initialCasePreferences();
    initial.counts.smoke = 3;
    initial.selected = ["smoke"];
    const changed = renameCaseType("smoke", "Comprobación rápida", initial.catalog);
    const saved = saveCasePreferences(
      "u",
      {
        ...initial,
        catalog: initial.catalog.map((type) => (type.id === "smoke" ? changed : type)),
      },
      store,
    );
    expect(loadCasePreferences("u", store).counts.smoke).toBe(3);
    expect(loadCasePreferences("u", store).catalog[0].label).toBe("Comprobación rápida");
    const removed = saveCasePreferences(
      "u",
      { ...saved, catalog: saved.catalog.filter((type) => type.id !== "smoke") },
      store,
    );
    expect(removed.selected).not.toContain("smoke");
    expect(loadCasePreferences("u", store).catalog.some((type) => type.id === "smoke")).toBe(false);
  });
  it("rechaza revisión antigua, corrupción, último tipo y fallo de cuota sin sobrescribir", () => {
    const store = storage(),
      old = loadCasePreferences("u", store);
    saveCasePreferences("u", old, store);
    const before = store.getItem(casePreferencesKey("u"));
    expect(() => saveCasePreferences("u", old, store)).toThrow("otra pestaña");
    expect(() =>
      saveCasePreferences("u", { ...loadCasePreferences("u", store), catalog: [] }, store),
    ).toThrow();
    expect(() =>
      saveCasePreferences("u", loadCasePreferences("u", store), {
        getItem: store.getItem,
        setItem: () => {
          throw Error("quota");
        },
      }),
    ).toThrow();
    expect(store.getItem(casePreferencesKey("u"))).toBe(before);
    store.values.set(casePreferencesKey("u"), "{");
    expect(() => loadCasePreferences("u", store)).toThrow();
  });
});
