import { z } from "zod";
import type { CreateTestCaseInput } from "../../backend/src/models/test-case.model";
const field = z.string().trim().max(10000);
const rowSchema = z.object({
  titulo: field.pipe(z.string().min(1).max(200)),
  suite: field.pipe(z.string().max(100)),
  tipo: field.pipe(z.string().min(1).max(100)),
  estado: z.enum(["Borrador", "Listo", "Obsoleto"]),
  precondiciones: field,
  accion: field.pipe(z.string().min(1)),
  resultadoEsperado: field.pipe(z.string().min(1)),
  clave: field.pipe(z.string().max(100)),
});
export const importColumns = [
  "clave",
  "titulo",
  "suite",
  "tipo",
  "estado",
  "precondiciones",
  "accion",
  "resultadoEsperado",
];
export interface CaseImportPreview {
  cases: Omit<CreateTestCaseInput, "projectId">[];
  errors: string[];
}
/** RFC 4180: preserves quoted separators, escaped quotes and multiline steps. */
export function parseCsv(text: string): string[][] {
  const delimiter = text.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let ended = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          ended = true;
        }
      } else value += c;
    } else if (c === '"' && !value && !ended) quoted = true;
    else if (c === delimiter) {
      row.push(value);
      value = "";
      ended = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      ended = false;
    } else {
      if (ended || c === '"') throw new Error("CSV inválido: comillas o separadores incorrectos.");
      value += c;
    }
  }
  if (quoted) throw new Error("CSV inválido: falta cerrar comillas.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}
export function previewCaseImport(rows: unknown[][]): CaseImportPreview {
  const errors: string[] = [];
  const cases: CaseImportPreview["cases"] = [];
  if (rows.length < 2 || rows.length > 1001)
    return {
      cases,
      errors: ["El archivo debe tener encabezados y entre 1 y 1000 filas de datos."],
    };
  const headers = rows[0].map((v) =>
    typeof v === "string" ? v.replace(/^\uFEFF/, "").trim() : "",
  );
  if (!importColumns.every((c) => headers.includes(c)) || new Set(headers).size !== headers.length)
    return {
      cases,
      errors: [`Encabezados requeridos: ${importColumns.join(", ")}. Usa la plantilla.`],
    };
  const groups = new Map<string, CaseImportPreview["cases"][number]>();
  rows.slice(1).forEach((values, index) => {
    if (values.every((v) => v === "" || v === null || v === undefined)) return;
    const data: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      data[h] = values[i] ?? "";
    });
    const parsed = rowSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(
        `Fila ${index + 2}: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
      );
      return;
    }
    const r = parsed.data;
    const key = r.clave || r.titulo;
    let item = groups.get(key);
    if (!item) {
      item = {
        title: r.titulo,
        suite: r.suite,
        testType: r.tipo,
        lifecycle: r.estado,
        preconditions: r.precondiciones,
        steps: [],
      };
      groups.set(key, item);
      cases.push(item);
    } else if (
      item.title !== r.titulo ||
      item.suite !== r.suite ||
      item.testType !== r.tipo ||
      item.lifecycle !== r.estado ||
      item.preconditions !== r.precondiciones
    ) {
      errors.push(`Fila ${index + 2}: los datos del caso ${key} no coinciden con sus otras filas.`);
      return;
    }
    item.steps!.push({ action: r.accion, expectedResult: r.resultadoEsperado });
    if (item.steps!.length > 100) errors.push(`Fila ${index + 2}: máximo 100 pasos por caso.`);
  });
  if (!cases.length && !errors.length) errors.push("El archivo no contiene casos.");
  return { cases, errors };
}
export async function readCaseFile(file: File): Promise<CaseImportPreview> {
  if (file.size > 2 * 1024 * 1024) throw new Error("Máximo 2 MiB por archivo.");
  if (file.name.toLowerCase().endsWith(".csv"))
    return previewCaseImport(parseCsv(await file.text()));
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw new Error("Selecciona un archivo CSV o Excel .xlsx.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  if (workbook.worksheets.length !== 1) throw new Error("Usa un libro con una sola hoja de casos.");
  const sheet = workbook.worksheets[0];
  if (sheet.rowCount > 1001 || sheet.columnCount > 30)
    throw new Error("Máximo 1000 filas de datos y 30 columnas.");
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values: unknown[] = [];
    for (let i = 1; i <= sheet.columnCount; i++) {
      const value: unknown = row.getCell(i).value;
      if (value !== null && typeof value !== "string")
        throw new Error("Las celdas deben ser texto, sin fórmulas, fechas ni objetos.");
      values.push(value ?? "");
    }
    rows.push(values);
  });
  return previewCaseImport(rows);
}
