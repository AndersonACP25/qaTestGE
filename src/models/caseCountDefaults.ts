import { categories, validCaseCount, type CaseCategory } from "./caseDesign.model";

export type CaseCountDefaults = Record<string, number>;

export const defaultCaseCountDefaults: CaseCountDefaults = Object.fromEntries(
  categories.map(({ id }) => [id, 1]),
);
export const defaultSelectedCategories = ["edge"];

function preferenceKey(userId: string) {
  return `qatestge-case-count-defaults-v1:${userId}`;
}
function selectedPreferenceKey(userId: string) {
  return `qatestge-case-design-categories-v1:${userId}`;
}

export function loadCaseCountDefaults(
  userId: string,
  storage?: Pick<Storage, "getItem">,
  catalog: CaseCategory[] = categories,
): CaseCountDefaults {
  let source = storage;
  if (!source && typeof window !== "undefined") {
    try {
      source = window.localStorage;
    } catch {
      return { ...defaultCaseCountDefaults };
    }
  }
  if (!source) return { ...defaultCaseCountDefaults };
  let serialized: string | null;
  try {
    serialized = source.getItem(preferenceKey(userId));
  } catch {
    return { ...defaultCaseCountDefaults };
  }
  if (!serialized) return { ...defaultCaseCountDefaults };

  let stored: unknown;
  try {
    stored = JSON.parse(serialized);
  } catch {
    return { ...defaultCaseCountDefaults };
  }
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
    return { ...defaultCaseCountDefaults };
  }

  const values = stored as Record<string, unknown>;
  return Object.fromEntries(
    catalog.map(({ id }) => [
      id,
      typeof values[id] === "number" && validCaseCount(values[id]) ? values[id] : 1,
    ]),
  );
}

export function saveCaseCountDefaults(
  userId: string,
  defaults: CaseCountDefaults,
  storage?: Pick<Storage, "setItem">,
  catalog: CaseCategory[] = categories,
) {
  const normalized = Object.fromEntries(
    catalog.map(({ id }) => {
      const value = defaults[id] ?? 1;
      if (!validCaseCount(value)) throw new RangeError(`Cantidad inicial inválida para ${id}.`);
      return [id, value];
    }),
  );
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  if (!target) throw new Error("El almacenamiento local no está disponible en este entorno.");
  target.setItem(preferenceKey(userId), JSON.stringify(normalized));
}

export function loadSelectedCategories(
  userId: string,
  storage?: Pick<Storage, "getItem">,
  catalog: CaseCategory[] = categories,
): string[] {
  let target = storage;
  if (!target && typeof window !== "undefined") {
    try {
      target = window.localStorage;
    } catch {
      return [...defaultSelectedCategories];
    }
  }
  if (!target) return [...defaultSelectedCategories];
  try {
    const stored: unknown = JSON.parse(target.getItem(selectedPreferenceKey(userId)) ?? "null");
    if (!Array.isArray(stored)) return [...defaultSelectedCategories];
    const valid = stored.filter(
      (id): id is string =>
        typeof id === "string" && catalog.some((category) => category.id === id),
    );
    const unique = [...new Set(valid)];
    return unique.length ? unique : [...defaultSelectedCategories];
  } catch {
    return [...defaultSelectedCategories];
  }
}

export function saveSelectedCategories(
  userId: string,
  selected: string[],
  storage?: Pick<Storage, "setItem">,
  catalog: CaseCategory[] = categories,
) {
  const knownIds = new Set(catalog.map(({ id }) => id));
  const normalized = [...new Set(selected)];
  if (!normalized.length || normalized.some((id) => !knownIds.has(id))) {
    throw new RangeError("Selecciona al menos un tipo de prueba válido.");
  }
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  if (!target) throw new Error("El almacenamiento local no está disponible en este entorno.");
  target.setItem(selectedPreferenceKey(userId), JSON.stringify(normalized));
}
