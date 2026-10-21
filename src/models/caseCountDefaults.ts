import { categories, validCaseCount } from "./caseDesign.model";

export type CaseCountDefaults = Record<string, number>;

export const defaultCaseCountDefaults: CaseCountDefaults = Object.fromEntries(
  categories.map(({ id }) => [id, 1]),
);

function preferenceKey(userId: string) {
  return `qatestge-case-count-defaults-v1:${userId}`;
}

export function loadCaseCountDefaults(
  userId: string,
  storage?: Pick<Storage, "getItem">,
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
    categories.map(({ id }) => [
      id,
      typeof values[id] === "number" && validCaseCount(values[id]) ? values[id] : 1,
    ]),
  );
}

export function saveCaseCountDefaults(
  userId: string,
  defaults: CaseCountDefaults,
  storage?: Pick<Storage, "setItem">,
) {
  const normalized = Object.fromEntries(
    categories.map(({ id }) => {
      const value = defaults[id];
      if (!validCaseCount(value)) throw new RangeError(`Cantidad inicial inválida para ${id}.`);
      return [id, value];
    }),
  );
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  if (!target) throw new Error("El almacenamiento local no está disponible en este entorno.");
  target.setItem(preferenceKey(userId), JSON.stringify(normalized));
}
