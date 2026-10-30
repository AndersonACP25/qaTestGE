import type { Bug, Tag, TestCase, TestRun } from "../types";

export interface TableExportData {
  title: string;
  filename: string;
  headers: string[];
  rows: string[][];
}

function titleWithTags(title: string, ids: string[] | undefined, tags: Tag[]) {
  return [title, ...tags.filter((tag) => ids?.includes(tag.id)).map((tag) => tag.name)].join("\n");
}

export function bugTableExport(bugs: Bug[], tags: Tag[]): TableExportData {
  return {
    title: "Bugs",
    filename: "bugs",
    headers: ["BUG ID", "TÍTULO", "PRIORIDAD", "ESTADO", "ASIGNADO", "CREADO"],
    rows: bugs.map((bug) => [
      bug.id,
      titleWithTags([bug.title, bug.project].filter(Boolean).join("\n"), bug.tagIds, tags),
      bug.priority,
      bug.status,
      bug.assignee,
      bug.updated,
    ]),
  };
}

export function caseTableExport(cases: TestCase[], tags: Tag[]): TableExportData {
  return {
    title: "Casos de prueba",
    filename: "casos-de-prueba",
    headers: ["CASO ID", "NOMBRE DEL CASO", "CLASIFICACIÓN", "RESPONSABLE", "ESTADO", "CREADO"],
    rows: cases.map((item) => [
      item.id,
      titleWithTags(item.title, item.tagIds, tags),
      `${item.suite || "—"}\n${item.testType ?? "Funcional"} · ${item.lifecycle ?? "Borrador"} · v${item.version ?? 1}`,
      item.assigneeName || "Sin asignar",
      item.status,
      item.updated,
    ]),
  };
}

export function runTableExport(runs: TestRun[], tags: Tag[]): TableExportData {
  return {
    title: "Test runs",
    filename: "test-runs",
    headers: ["RUN ID", "NOMBRE DE EJECUCIÓN", "CASOS", "PROGRESO", "ESTADO", "RESPONSABLE"],
    rows: runs.map((item) => [
      item.id,
      titleWithTags(item.title, item.tagIds, tags),
      item.cases,
      `${item.progress}%`,
      item.status,
      item.owner,
    ]),
  };
}

function markdownCell(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

export function tableMarkdown(data: TableExportData) {
  const row = (cells: string[]) => `| ${cells.map(markdownCell).join(" | ")} |`;
  return [
    `# ${data.title}`,
    "",
    row(data.headers),
    row(data.headers.map(() => "---")),
    ...data.rows.map(row),
    "",
  ].join("\n");
}
