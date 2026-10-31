import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { previewResourceRows, readResourceFile } from "../../src/models/resourceImport";
import {
  rangeInput,
  requirementInput,
  tagImportInput,
} from "../../backend/src/routes/analytics.routes";
import { parseApiData } from "../../src/contracts/apiContracts";
describe("importación de recursos", () => {
  it("valida vocabularios y límites antes de cualquier escritura", () => {
    const h = ["titulo", "descripcion", "prioridad", "severidad", "entorno", "version"];
    expect(
      previewResourceRows("bugs", [h, ["Acceso", "", "Alta", "Media", "QA", "1.0"]]).errors,
    ).toEqual([]);
    for (const row of [
      ["", "", "Alta", "Media", "", ""],
      ["Acceso", "", "Urgente", "Media", "", ""],
      ["Acceso", "a".repeat(5001), "Alta", "Media", "", ""],
      ["Acceso", "", "Alta", "Media", "a".repeat(101), ""],
    ])
      expect(previewResourceRows("bugs", [h, row]).errors).not.toHaveLength(0);
  });
  it("rechaza tags duplicados y colores inválidos", () => {
    expect(
      previewResourceRows("tags", [
        ["nombre", "color"],
        ["API", "#aabbcc"],
        ["api", "#aabbcc"],
      ]).errors,
    ).toHaveLength(1);
    expect(
      previewResourceRows("tags", [
        ["nombre", "color"],
        ["API", "rojo"],
      ]).errors,
    ).toHaveLength(1);
  });
  it("la plantilla distribuida se puede importar para los tres recursos", async () => {
    const bytes = await readFile(
      new URL("../../public/templates/plantilla-qaTestGE.xlsx", import.meta.url),
    );
    for (const kind of ["cases", "bugs", "tags"] as const) {
      const result = await readResourceFile(kind, new File([bytes], "plantilla.xlsx"));
      expect(result.errors).toEqual([]);
      expect(result.items).toHaveLength(1);
      if (result.kind === "cases") expect(result.items[0].steps).toHaveLength(2);
    }
  });
  it("no interpreta fórmulas de Excel y rechaza tamaños y formatos no admitidos", async () => {
    const { Workbook } = await import("exceljs");
    const w = new Workbook();
    const s = w.addWorksheet("Tags");
    s.addRow(["nombre", "color"]);
    s.addRow(["Tag", { formula: "1+1", result: 2 }]);
    await expect(
      readResourceFile("tags", new File([new Uint8Array(await w.xlsx.writeBuffer())], "tags.xlsx")),
    ).rejects.toThrow("sin fórmulas");
    await expect(readResourceFile("bugs", new File(["a"], "bug.xls"))).rejects.toThrow(".xlsx");
    await expect(
      readResourceFile("bugs", new File([new Uint8Array(2097153)], "big.xlsx")),
    ).rejects.toThrow("2 MiB");
  });
});
describe("contratos de analítica", () => {
  it("rechaza fechas inexistentes, períodos invertidos y rangos excesivos", () => {
    for (const r of [
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-03-01", to: "2026-02-01" },
      { from: "2024-01-01", to: "2026-01-01" },
    ])
      expect(rangeInput.safeParse(r).success).toBe(false);
    expect(rangeInput.safeParse({ from: "2024-02-29", to: "2024-02-29" }).success).toBe(true);
  });
  it("valida referencias únicas y versiones separadas de los IDs", () => {
    const input = {
      projectId: "1",
      code: "LOGIN",
      title: "Acceso",
      description: "",
      caseIds: ["TC-001"],
    };
    expect(requirementInput.safeParse(input).success).toBe(true);
    expect(requirementInput.safeParse({ ...input, caseIds: ["TC-001", "TC-001"] }).success).toBe(
      false,
    );
    expect(
      tagImportInput.safeParse({
        rows: [
          { name: "API", color: "#ABCDEF" },
          { name: "api", color: "#ABCDEF" },
        ],
      }).success,
    ).toBe(false);
  });
  it("rechaza respuestas de cobertura y de PDF incompletas", () => {
    expect(() =>
      parseApiData("/coverage-matrix", "GET", { rows: [], total: -1, limit: 50, offset: 0 }),
    ).toThrow();
    expect(() =>
      parseApiData("/test-runs/RUN-001/report", "GET", { title: "Falta snapshot" }),
    ).toThrow();
  });
});
