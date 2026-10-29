import { categories, type CaseCategory, maxCaseCount } from "./caseDesign.model";
export function createCustomCaseType(label: string, catalog: CaseCategory[]): CaseCategory {
  const name = label.trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) throw new Error("Escribe un nombre de entre 1 y 60 caracteres.");
  if (catalog.some((item) => item.label.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")))
    throw new Error("Ya existe un tipo con ese nombre.");
  const baseId = "custom:" + name.toLocaleLowerCase("es");
  let id = baseId;
  let suffix = 2;
  while (catalog.some((item) => item.id === id)) id = `${baseId}:${suffix++}`;
  return {
    id,
    label: name,
    description: "Tipo personalizado: adapta los pasos antes de guardar.",
    color: "#7c3aed",
    steps: Array.from({ length: maxCaseCount }, (_, i) => ({
      action: "Definir escenario " + (i + 1) + " de " + name,
      expected: "Definir el resultado esperado.",
    })),
  };
}
export function loadCustomCaseTypes(
  userId: string,
  storage?: Pick<Storage, "getItem">,
): CaseCategory[] {
  try {
    const stored: unknown = JSON.parse(
      (storage ?? window.localStorage).getItem("qatestge-custom-case-types-v1:" + userId) ?? "[]",
    );
    if (!Array.isArray(stored)) return [];
    const result: CaseCategory[] = [];
    for (const entry of stored) {
      const label = typeof entry === "string" ? entry : entry?.label;
      if (typeof label !== "string") continue;
      try {
        const created = createCustomCaseType(label, [...categories, ...result]);
        if (typeof entry === "object" && entry !== null) {
          if (
            typeof entry.id !== "string" ||
            !entry.id.startsWith("custom:") ||
            entry.id.length > 100 ||
            result.some((item) => item.id === entry.id)
          )
            continue;
          created.id = entry.id;
        }
        result.push(created);
      } catch {
        /* Ignore invalid entries. */
      }
    }
    return result;
  } catch {
    return [];
  }
}
export function saveCustomCaseTypes(
  userId: string,
  custom: CaseCategory[],
  storage?: Pick<Storage, "setItem">,
) {
  (storage ?? window.localStorage).setItem(
    "qatestge-custom-case-types-v1:" + userId,
    JSON.stringify(custom.map(({ id, label }) => ({ id, label }))),
  );
}

export function renameCustomCaseType(id: string, label: string, catalog: CaseCategory[]) {
  if (!id.startsWith("custom:") || !catalog.some((item) => item.id === id))
    throw new Error("Solo puedes editar tipos personalizados existentes.");
  return {
    ...createCustomCaseType(
      label,
      catalog.filter((item) => item.id !== id),
    ),
    id,
  };
}
