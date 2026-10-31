import { z } from "zod";
import { readImportRows, previewCaseImport } from "./caseImport";
const priority = z.enum(["Crítica", "Alta", "Media", "Baja"]);
const bugRow = z.object({
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().max(5000),
  prioridad: priority,
  severidad: priority,
  entorno: z.string().trim().max(100),
  version: z.string().trim().max(100),
});
const tagRow = z.object({
  nombre: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export type ImportKind = "bugs" | "cases" | "tags";
export type ResourcePreview =
  | { kind: "cases"; items: ReturnType<typeof previewCaseImport>["cases"]; errors: string[] }
  | { kind: "bugs"; items: z.output<typeof bugRow>[]; errors: string[] }
  | { kind: "tags"; items: z.output<typeof tagRow>[]; errors: string[] };
export function previewResourceRows(kind: ImportKind, rows: unknown[][]): ResourcePreview {
  if (kind === "cases") {
    const result = previewCaseImport(rows);
    return { kind, items: result.cases, errors: result.errors };
  }
  const errors: string[] = [];
  const headers = (rows[0] ?? []).map((v) =>
    typeof v === "string" ? v.replace(/^\uFEFF/, "").trim() : "",
  );
  const columns =
    kind === "bugs"
      ? ["titulo", "descripcion", "prioridad", "severidad", "entorno", "version"]
      : ["nombre", "color"];
  if (
    rows.length < 2 ||
    rows.length > 1001 ||
    headers.length > 30 ||
    !columns.every((c) => headers.includes(c)) ||
    new Set(headers).size !== headers.length
  )
    return {
      kind,
      items: [],
      errors: [`Usa entre 1 y 1000 filas de datos y los encabezados: ${columns.join(", ")}.`],
    };
  const objects: Record<string, unknown>[] = [];
  rows.slice(1).forEach((values, i) => {
    if (values.every((v) => v === "" || v == null)) return;
    const input = Object.fromEntries(headers.map((h, j) => [h, values[j] ?? ""]));
    const parsed = (kind === "bugs" ? bugRow : tagRow).safeParse(input);
    if (!parsed.success)
      errors.push(
        `Fila ${i + 2}: ${parsed.error.issues.map((v) => `${v.path.join(".")}: ${v.message}`).join("; ")}`,
      );
    else objects.push(parsed.data);
  });
  if (kind === "bugs") {
    const items = objects.map((v) => bugRow.parse(v));
    if (!items.length && !errors.length) errors.push("El archivo no contiene bugs.");
    return { kind, items, errors };
  }
  const items = objects.map((v) => tagRow.parse(v));
  const names = new Set<string>();
  for (const item of items) {
    const name = item.nombre.toLowerCase();
    if (names.has(name)) errors.push(`Tag repetido: ${item.nombre}.`);
    names.add(name);
  }
  if (!items.length && !errors.length) errors.push("El archivo no contiene tags.");
  return { kind, items, errors };
}
export async function readResourceFile(kind: ImportKind, file: File) {
  return previewResourceRows(
    kind,
    await readImportRows(file, { bugs: "Bugs", cases: "Casos", tags: "Tags" }[kind]),
  );
}
