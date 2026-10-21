import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { Bug, TestCase } from "../../src/types";
import { createDesignedExcelExport, createDesignedPdfExport, designedCaseExportRows } from "../../src/utils/exportCases";
import { recordExportFormats, toMarkdown } from "../../src/utils/exportRecord";

const testCase: TestCase = {
  id: "TC-007",
  title: "Validar acceso",
  suite: "",
  status: "Pendiente",
  updated: "2026-10-20",
  preconditions: "Abrir el formulario",
  steps: [
    { action: "Enviar datos válidos", expectedResult: "Se permite continuar" },
    { action: "Cerrar el formulario", expectedResult: "Se pierde el estado local" },
  ],
};

const bug: Bug = {
  id: "BUG-008",
  title: "Pantalla vacía",
  project: "Web",
  description: "Al abrir el panel no hay contenido.",
  priority: "Alta",
  status: "Abierto",
  assignee: "QA",
  color: "blue",
  updated: "2026-10-20",
};

describe("test case and record exports", () => {
  it("preserves multiple actions and expected results in Markdown", () => {
    const markdown = toMarkdown({ kind: "case", record: testCase });
    expect(markdown).toContain("## Pasos");
    expect(markdown).toContain("1. **Acción:** Enviar datos válidos\n   **Resultado esperado:** Se permite continuar");
    expect(markdown).toContain("2. **Acción:** Cerrar el formulario\n   **Resultado esperado:** Se pierde el estado local");
    expect(toMarkdown({ kind: "bug", record: bug })).toContain("Al abrir el panel no hay contenido.");
  });

  it("exports designed examples as a separate row per step", async () => {
    const examples = [{ categoryLabel: "API", caseNumber: 2, steps: testCase.steps! }];
    expect(designedCaseExportRows(examples)).toEqual([
      ["API", 2, 1, "Enviar datos válidos", "Se permite continuar"],
      ["API", 2, 2, "Cerrar el formulario", "Se pierde el estado local"],
    ]);
    const buffer = await createDesignedExcelExport("Probar acceso", examples);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet("Diseño de casos")!.getCell("E7").text).toBe("Se pierde el estado local");
    const pdf = new TextDecoder().decode(await createDesignedPdfExport("Probar acceso", examples));
    expect(pdf).toMatch(/^%PDF-/);
    expect(pdf).toContain("Se permite continuar");
  });

  it("offers PDF, Excel and Markdown as record export formats", () => {
    expect(recordExportFormats).toEqual(["pdf", "xlsx", "md"]);
  });
});
