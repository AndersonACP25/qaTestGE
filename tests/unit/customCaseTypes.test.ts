import { describe, expect, it } from "vitest";
import { categories, selectCaseExamples } from "../../src/models/caseDesign.model";
import {
  createCustomCaseType,
  loadCustomCaseTypes,
  saveCustomCaseTypes,
  renameCustomCaseType,
} from "../../src/models/customCaseTypes";
import {
  loadCaseCountDefaults,
  saveCaseCountDefaults,
  loadSelectedCategories,
  saveSelectedCategories,
} from "../../src/models/caseCountDefaults";
describe("tipos personalizados", () => {
  it("conserva el identificador al editar, evita colisiones y lee el formato anterior", () => {
    const original = createCustomCaseType("Contratos", categories);
    const renamed = renameCustomCaseType(original.id, "Servicios", [...categories, original]);
    expect(renamed.id).toBe(original.id);
    expect(renamed.label).toBe("Servicios");
    expect(createCustomCaseType("Contratos", [...categories, renamed]).id).not.toBe(original.id);
    expect(() => renameCustomCaseType("smoke", "Nuevo", categories)).toThrow();
    expect(() => renameCustomCaseType(original.id, "Smoke", [...categories, original])).toThrow();
    expect(loadCustomCaseTypes("u", { getItem: () => '["Anterior"]' })[0].label).toBe("Anterior");
    let stored = "";
    saveCustomCaseTypes("u", [renamed], {
      setItem: (_key, value) => {
        stored = value;
      },
    });
    expect(loadCustomCaseTypes("u", { getItem: () => stored })[0]).toEqual(renamed);
  });
  it("rechaza nombres vac?os, largos y duplicados normalizados", () => {
    for (const label of [" ", "a".repeat(61), "  SMOKE "])
      expect(() => createCustomCaseType(label, categories)).toThrow();
    const custom = createCustomCaseType("  Contratos   externos ", categories);
    expect(custom.label).toBe("Contratos externos");
    expect(() => createCustomCaseType("contratos externos", [...categories, custom])).toThrow();
  });
  it("persiste por usuario y conserva selección, cantidades y ejemplos", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const custom = createCustomCaseType("Contratos", categories);
    saveCustomCaseTypes("uno", [custom], storage);
    expect(loadCustomCaseTypes("dos", storage)).toEqual([]);
    const catalog = [...categories, ...loadCustomCaseTypes("uno", storage)];
    saveCaseCountDefaults("uno", { [custom.id]: 5 }, storage, catalog);
    saveSelectedCategories("uno", [custom.id], storage, catalog);
    const selected = loadSelectedCategories("uno", storage, catalog);
    const counts = loadCaseCountDefaults("uno", storage, catalog);
    expect(selectCaseExamples(selected, counts, catalog)[0].steps).toHaveLength(5);
    expect(categories.some((item) => item.id === custom.id)).toBe(false);
  });
  it("tolera datos corruptos y almacenamiento inaccesible", () => {
    expect(loadCustomCaseTypes("uno", { getItem: () => "{" })).toEqual([]);
    expect(
      loadCustomCaseTypes("uno", {
        getItem: () => {
          throw new Error("bloqueado");
        },
      }),
    ).toEqual([]);
    expect(() =>
      saveCustomCaseTypes("uno", [], {
        setItem: () => {
          throw new Error("sin espacio");
        },
      }),
    ).toThrow();
    expect(
      loadCustomCaseTypes("uno", {
        getItem: () => JSON.stringify([null, "Smoke", "Nuevo", "nuevo"]),
      }),
    ).toHaveLength(1);
  });
});
