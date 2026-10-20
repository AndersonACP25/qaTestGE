export interface ExportCategory {
  readonly label: string;
  readonly steps: readonly { readonly action: string; readonly expected: string }[];
}

const notice = "Ejemplos fijos ilustrativos. IA no conectada. No son casos guardados del proyecto.";
export const exportHeaders = ["Categoría", "Paso", "Acción", "Resultado esperado"];

export function caseExportRows(categories: readonly ExportCategory[]) {
  return categories.flatMap((category) => category.steps.map((step, index) =>
    [category.label, index + 1, step.action, step.expected]));
}

export async function createExcelExport(description: string, categories: readonly ExportCategory[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Casos de prueba");
  sheet.addRow(["qaTestGE · Diseño de casos de prueba"]);
  sheet.addRow([notice]);
  sheet.addRow(["Descripción proporcionada", description]);
  sheet.addRow([]);
  sheet.addRow(exportHeaders);
  for (const row of caseExportRows(categories)) sheet.addRow(row);
  [24, 12, 65, 65].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.mergeCells("A1:D1");
  sheet.mergeCells("A2:D2");
  sheet.mergeCells("B3:D3");
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF6553CF" } };
  sheet.getRow(2).height = 32;
  sheet.getRow(3).height = Math.max(32, Math.ceil(description.length / 130) * 18);
  sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6553CF" } };
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.autoFilter = { from: "A5", to: `D${sheet.rowCount}` };
  return workbook.xlsx.writeBuffer();
}

export async function createPdfExport(description: string, categories: readonly ExportCategory[]) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("qaTestGE - Diseño de casos de prueba", 14, 16);
  autoTable(doc, {
    startY: 23,
    head: [["Descripción proporcionada", "Alcance"]],
    body: [[description, notice]],
    styles: { fontSize: 10, overflow: "linebreak", cellPadding: 3 },
    headStyles: { fillColor: [101, 83, 207] },
    margin: { bottom: 18 },
  });
  autoTable(doc, {
    head: [exportHeaders], body: caseExportRows(categories),
    styles: { fontSize: 10, overflow: "linebreak", cellPadding: 3 },
    headStyles: { fillColor: [101, 83, 207] },
    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 15 } },
    margin: { bottom: 18 }, rowPageBreak: "avoid",
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(`qaTestGE · Ejemplos · Página ${page} de ${doc.getNumberOfPages()}`, 14, 202);
  }
  return doc.output("arraybuffer");
}

export async function downloadCaseExport(format: "xlsx" | "pdf", description: string, categories: readonly ExportCategory[]) {
  const bytes = format === "xlsx" ? await createExcelExport(description, categories) : await createPdfExport(description, categories);
  const blob = new Blob([new Uint8Array(bytes)], { type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qatestge-casos-ejemplo.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
