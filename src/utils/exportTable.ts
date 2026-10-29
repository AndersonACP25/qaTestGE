import type { TableExportData } from "../models/tableExport";
import { tableMarkdown } from "../models/tableExport";
import type { ExportFormat } from "./exportRecord";
import { download } from "./download";

export async function createTableExport(
  format: ExportFormat,
  data: TableExportData,
): Promise<Blob> {
  if (format === "md")
    return new Blob([tableMarkdown(data)], { type: "text/markdown;charset=utf-8" });
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(data.title);
    sheet.addRow(data.headers);
    // Values remain strings: user text is never interpreted as a formula.
    data.rows.forEach((row) => sheet.addRow(row));
    sheet.columns.forEach((column, index) => {
      column.width = index === 1 ? 55 : 24;
    });
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16754B" } };
    return new Blob([new Uint8Array(await workbook.xlsx.writeBuffer())], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text(data.title, 14, 18);
  autoTable(doc, {
    startY: 25,
    head: [data.headers],
    body: data.rows,
    styles: { fontSize: 10, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [22, 117, 75] },
  });
  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

export async function exportTable(format: ExportFormat, data: TableExportData) {
  download(await createTableExport(format, data), `${data.filename}.${format}`);
}
