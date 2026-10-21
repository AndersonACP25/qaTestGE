import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { caseExportRows, createExcelExport, createPdfExport } from "../../src/utils/exportCases";

const categories = [
  {
    label: "API",
    steps: [
      { action: "Enviar petición", expected: "Respuesta válida" },
      { action: "Omitir título", expected: "Error de validación" },
    ],
  },
];

describe("case exports", () => {
  it("preserves selected categories, step order and accents", () => {
    expect(caseExportRows(categories)).toEqual([
      ["API", 1, "Enviar petición", "Respuesta válida"],
      ["API", 2, "Omitir título", "Error de validación"],
    ]);
    expect(caseExportRows([])).toEqual([]);
  });

  it("creates a readable XLSX with literal input, description and all steps", async () => {
    const buffer = await createExcelExport('=HYPERLINK("https://example.com")', categories);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Casos de prueba")!;
    expect(sheet.getCell("B3").value).toBe('=HYPERLINK("https://example.com")');
    expect(sheet.getCell("B3").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("A2").text).toContain("Ejemplos fijos");
    expect(sheet.getCell("C6").text).toBe("Enviar petición");
    expect(sheet.getCell("D7").text).toBe("Error de validación");
    expect(sheet.rowCount).toBe(7);
  });

  it("generates PDF bytes even for a description spanning multiple pages", async () => {
    const bytes = await createPdfExport(
      "Requisito con acentos: descripción. ".repeat(500),
      categories,
    );
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf).toMatch(/^%PDF-/);
    expect(pdf).toContain("Enviar petici");
    expect(pdf.match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
    expect(pdf).toContain("%%EOF");
  });
});
