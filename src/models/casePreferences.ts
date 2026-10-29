import { z } from "zod";
import { categories, type CaseCategory, validCaseCount } from "./caseDesign.model";
import { createCustomCaseType, loadCustomCaseTypes } from "./customCaseTypes";
import { loadCaseCountDefaults, loadSelectedCategories } from "./caseCountDefaults";

export interface CasePreferences {
  catalog: CaseCategory[];
  counts: Record<string, number>;
  selected: string[];
  revision: string;
}
const documentSchema = z.object({
  version: z.literal(2),
  revision: z.string(),
  types: z
    .array(z.object({ id: z.string().min(1).max(120), label: z.string().trim().min(1).max(60) }))
    .min(1)
    .max(100),
  counts: z.record(z.string(), z.number().int().min(1).max(5)),
  selected: z.array(z.string()).min(1),
});
export const casePreferencesKey = (userId: string) => `qatestge-case-preferences-v2:${userId}`;
export function initialCasePreferences(): CasePreferences {
  return {
    catalog: categories.map((item) => ({ ...item })),
    counts: Object.fromEntries(categories.map(({ id }) => [id, 1])),
    selected: ["edge"],
    revision: "0",
  };
}

export function normalizeCasePreferences(input: CasePreferences): CasePreferences {
  if (!input.catalog.length || input.catalog.length > 100)
    throw new Error("Conserva entre 1 y 100 tipos de prueba.");
  const ids = new Set<string>(),
    names = new Set<string>();
  for (const type of input.catalog) {
    const name = type.label.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
    if (!name || type.label.length > 60 || ids.has(type.id) || names.has(name))
      throw new Error("Los tipos deben tener nombres únicos de entre 1 y 60 caracteres.");
    if (!categories.some((item) => item.id === type.id) && !type.id.startsWith("custom:"))
      throw new Error("Tipo de prueba no válido.");
    ids.add(type.id);
    names.add(name);
  }
  const selected = [...new Set(input.selected)].filter((id) => ids.has(id));
  const counts = Object.fromEntries(
    input.catalog.map(({ id }) => {
      const value = input.counts[id] ?? 1;
      if (!validCaseCount(value)) throw new Error("Las cantidades deben estar entre 1 y 5.");
      return [id, value];
    }),
  );
  return { ...input, selected: selected.length ? selected : [input.catalog[0].id], counts };
}
export function loadCasePreferences(
  userId: string,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): CasePreferences {
  const raw = storage.getItem(casePreferencesKey(userId));
  if (!raw) {
    const custom = loadCustomCaseTypes(userId, storage);
    const legacy = storage.getItem(`qatestge-custom-case-types-v1:${userId}`);
    if (legacy) {
      const entries: unknown = JSON.parse(legacy);
      if (!Array.isArray(entries) || entries.length !== custom.length)
        throw new Error("Los tipos antiguos necesitan revisión antes de migrarlos.");
    }
    const catalog = [...categories, ...custom];
    return normalizeCasePreferences({
      catalog,
      counts: loadCaseCountDefaults(userId, storage, catalog),
      selected: loadSelectedCategories(userId, storage, catalog),
      revision: "0",
    });
  }
  const doc = documentSchema.parse(JSON.parse(raw));
  const catalog = doc.types.map(({ id, label }) => {
    const builtin = categories.find((item) => item.id === id);
    return builtin ? { ...builtin, label } : { ...createCustomCaseType(label, []), id };
  });
  return normalizeCasePreferences({
    catalog,
    counts: doc.counts,
    selected: doc.selected,
    revision: doc.revision,
  });
}
export function saveCasePreferences(
  userId: string,
  input: CasePreferences,
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): CasePreferences {
  const existing = loadCasePreferences(userId, storage);
  if (existing.revision !== input.revision)
    throw new Error(
      "Las preferencias cambiaron en otra pestaña. Recarga la configuración antes de guardar.",
    );
  const normalized = normalizeCasePreferences(input);
  const next = { ...normalized, revision: crypto.randomUUID() };
  storage.setItem(
    casePreferencesKey(userId),
    JSON.stringify({
      version: 2,
      revision: next.revision,
      types: next.catalog.map(({ id, label }) => ({ id, label })),
      counts: next.counts,
      selected: next.selected,
    }),
  );
  return next;
}
export function renameCaseType(id: string, label: string, catalog: CaseCategory[]) {
  const existing = catalog.find((item) => item.id === id);
  if (!existing) throw new Error("El tipo ya no está disponible.");
  const normalized = label.trim().replace(/\s+/g, " ");
  if (
    !normalized ||
    normalized.length > 60 ||
    catalog.some(
      (item) =>
        item.id !== id && item.label.toLocaleLowerCase("es") === normalized.toLocaleLowerCase("es"),
    )
  )
    throw new Error("Introduce un nombre único de entre 1 y 60 caracteres.");
  return { ...existing, label: normalized };
}
