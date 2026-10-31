import { describe, expect, it } from "vitest";
import { parseCsv, previewCaseImport, importColumns } from "../../src/models/caseImport";
import { workflowInput } from "../../backend/src/routes/quality.routes";
import { typeCoverage } from "../../src/models/typeCoverage";
import type { TestCase, TestRun } from "../../src/types";
import { designedCaseInput } from "../../src/models/designedCaseInput";
describe("importación revisable de casos", () => {
  it("preserva separadores, comillas y saltos de línea en pasos", () => {
    const rows = parseCsv(
      `${importColumns.join(";")}\r\nA;Acceso;;Funcional;Listo;;"Abrir; confirmar";"Resultado\ncon dos líneas"\r\nA;Acceso;;Funcional;Listo;;"Escribir ""QA""";Mostrar\r\n`,
    );
    const result = previewCaseImport(rows);
    expect(result.errors).toEqual([]);
    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].steps).toEqual([
      { action: "Abrir; confirmar", expectedResult: "Resultado\ncon dos líneas" },
      { action: 'Escribir "QA"', expectedResult: "Mostrar" },
    ]);
  });
  it("rechaza filas incompletas, celdas de fórmula y grupos ambiguos antes de guardar", () => {
    const rows: unknown[][] = [
      importColumns,
      ["A", "Acceso", "", "API", "Listo", "", "Abrir", "Bien"],
      ["A", "Otro", "", "API", "Listo", "", "Enviar", "Bien"],
      ["B", "Acceso", "", "API", "Publicado", "", "Abrir", "Bien"],
      ["C", "Acceso", "", "API", "Listo", "", { formula: "1+1" }, "Bien"],
    ];
    const result = previewCaseImport(rows);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.join(" ")).toContain("Fila 3");
  });
  it("rechaza CSV truncado y archivos sin encabezados", () => {
    expect(() => parseCsv('a;b\n"sin cierre')).toThrow();
    expect(previewCaseImport([["titulo"], ["Caso"]]).errors).not.toHaveLength(0);
  });
  it("el diseñador guarda tipo sin convertirlo en suite", () => {
    const input = designedCaseInput("1", "", {
      categoryLabel: "Seguridad",
      steps: [{ action: "Enviar", expected: "Rechazar" }],
    });
    expect(input.testType).toBe("Seguridad");
    expect(input.suite).toBeUndefined();
    expect(input.lifecycle).toBe("Borrador");
  });
});
describe("vocabulario de bugs", () => {
  it("acepta estados propios y rechaza aristas, duplicados o revisiones inválidas", () => {
    const valid = {
      states: ["Nuevo", "Validado"],
      transitions: { Nuevo: ["Validado"], Validado: ["Nuevo"] },
      revision: 1,
    };
    expect(workflowInput.safeParse(valid).success).toBe(true);
    for (const bad of [
      { ...valid, states: ["Nuevo", "Nuevo"] },
      { ...valid, transitions: { Nuevo: ["Ausente"], Validado: [] } },
      { ...valid, revision: 0 },
      { ...valid, transitions: { Nuevo: ["Nuevo"], Validado: [] } },
    ])
      expect(workflowInput.safeParse(bad).success).toBe(false);
  });
});
describe("cobertura por tipo", () => {
  it("cuenta casos distintos con resultados registrados y excluye obsoletos", () => {
    const cases = [
      { id: "TC-1", testType: "Seguridad" },
      { id: "TC-2", testType: "Seguridad" },
      { id: "TC-3", testType: "API", lifecycle: "Obsoleto" },
    ] as TestCase[];
    const runs = [
      {
        results: [
          { caseId: "TC-1", executedAt: "2026-01-01" },
          { caseId: "TC-1", executedAt: "2026-02-01" },
          { caseId: "TC-2", executedAt: null },
          { caseId: "TC-3", executedAt: "2026-01-01" },
        ],
      },
    ] as TestRun[];
    expect(typeCoverage(cases, runs)).toEqual([{ type: "Seguridad", total: 2, executed: 1 }]);
    expect(typeCoverage([], [])).toEqual([]);
  });
});

describe("archivos Excel", () => {
  it("lee filas de texto desde xlsx y rechaza fórmulas", async () => {
    const { Workbook } = await import("exceljs");
    const { readCaseFile } = await import("../../src/models/caseImport");
    const book = new Workbook();
    const sheet = book.addWorksheet("Casos");
    sheet.addRow(importColumns);
    sheet.addRow(["C1", "Validar API", "", "API", "Listo", "", "Enviar", "Rechazar"]);
    const bytes = await book.xlsx.writeBuffer();
    const result = await readCaseFile(new File([new Uint8Array(bytes)], "casos.xlsx"));
    expect(result.errors).toEqual([]);
    expect(result.cases[0].testType).toBe("API");
    sheet.getCell("G2").value = { formula: "1+1", result: 2 };
    const formula = await book.xlsx.writeBuffer();
    await expect(readCaseFile(new File([new Uint8Array(formula)], "casos.xlsx"))).rejects.toThrow(
      "sin fórmulas",
    );
  });
});
