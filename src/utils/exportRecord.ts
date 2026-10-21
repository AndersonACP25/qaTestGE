import type { Bug, TestCase } from "../types";

export const recordExportFormats = ["pdf", "xlsx", "md"] as const;
export type ExportFormat = (typeof recordExportFormats)[number];
export type ExportRecord =
  | { kind: "bug"; record: Bug }
  | { kind: "case"; record: TestCase };

export async function exportRecord(format: ExportFormat, target: ExportRecord) {
  const { kind, record } = target;
  const filename = `${safeFilename(record.id)}.${format}`;
  if (format === "md") {
    download(new Blob([toMarkdown(target)], { type: "text/markdown;charset=utf-8" }), filename);
    return;
  }
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(kind === "bug" ? "Bug" : "Caso de prueba");
    sheet.columns = [{ header: "Campo", key: "field", width: 28 }, { header: "Valor", key: "value", width: 90 }];
    sheet.addRows(recordRows(target).map(([field, value]) => ({ field, value: safeSpreadsheetText(value) })));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6553CF" } };
    sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
    const bytes = await workbook.xlsx.writeBuffer();
    download(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    return;
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(kind === "bug" ? `Bug ${record.id}` : `Caso de prueba ${record.id}`, 14, 18);
  autoTable(doc, {
    startY: 25,
    head: [["Campo", "Valor"]],
    body: recordRows(target),
    styles: { fontSize: 10, overflow: "linebreak", cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [101, 83, 207] },
    columnStyles: { 0: { cellWidth: 42 } },
    margin: { bottom: 18 },
  });
  download(new Blob([doc.output("arraybuffer")], { type: "application/pdf" }), filename);
}

export function toMarkdown(target: ExportRecord) {
  const { kind, record } = target;
  const rows = recordRows(target);
  if (kind === "bug") {
    return `# ${record.id} · ${record.title}\n\n${rows.filter(([field]) => field !== "Título").map(([field, value]) => `- **${field}:** ${value || "—"}`).join("\n")}\n\n## Descripción\n\n${record.description || "—"}\n`;
  }
  const steps = record.steps ?? [];
  return `# ${record.id} · ${record.title}\n\n${rows.filter(([field]) => field !== "Título" && field !== "Pasos").map(([field, value]) => `- **${field}:** ${value || "—"}`).join("\n")}\n\n## Precondiciones\n\n${record.preconditions || "—"}\n\n## Pasos\n\n${steps.length
    ? steps.map((step, index) => `${index + 1}. **Acción:** ${step.action}\n   **Resultado esperado:** ${step.expectedResult}`).join("\n")
    : "Sin pasos definidos."}\n`;
}

function recordRows(target: ExportRecord): [string, string][] {
  if (target.kind === "bug") {
    const { record } = target;
    return [
      ["ID", record.id],
      ["Título", record.title],
      ["Proyecto", record.project ?? ""],
      ["Prioridad", record.priority ?? ""],
      ["Estado", record.status],
      ["Responsable", record.assignee ?? ""],
      ["Descripción", record.description ?? ""],
      ["Creado", record.createdAt ?? record.updated],
    ];
  }
  const { record } = target;
  return [
    ["ID", record.id],
    ["Título", record.title],
    ["Suite", record.suite ?? ""],
    ["Estado", record.status],
    ["Precondiciones", record.preconditions ?? ""],
    ["Pasos", (record.steps ?? []).map((step, index) => `${index + 1}. Acción: ${step.action}\n   Resultado esperado: ${step.expectedResult}`).join("\n")],
    ["Creado", record.createdAt ?? record.updated],
  ];
}

function safeSpreadsheetText(value: string) {
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "qatestge-registro";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
