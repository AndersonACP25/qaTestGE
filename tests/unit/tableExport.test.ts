import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  bugTableExport,
  caseTableExport,
  runTableExport,
  tableMarkdown,
} from "../../src/models/tableExport";
import { createTableExport } from "../../src/utils/exportTable";
import type { Bug, TestCase, TestRun } from "../../src/types";

describe("exportación de las columnas del listado", () => {
  const bug: Bug = {
    id: "BUG-1",
    title: "=Título | <QA>",
    project: "Portal",
    priority: "Alta",
    status: "Abierto",
    assignee: "Ana",
    color: "blue",
    updated: "Hoy",
    description: "DETALLE PRIVADO",
    tagIds: ["tag-1"],
  };
  it("incluye únicamente filas recibidas, valores visibles y tags", () => {
    const data = bugTableExport(
      [bug],
      [{ id: "tag-1", projectId: "1", name: "Smoke", color: "#fff", createdAt: "Hoy" }],
    );
    expect(data.rows).toEqual([
      ["BUG-1", "=Título | <QA>\nPortal\nSmoke", "Alta", "Abierto", "Ana", "Hoy"],
    ]);
    expect(tableMarkdown(data)).not.toContain("DETALLE PRIVADO");
    expect(tableMarkdown(data)).toContain("\\| &lt;QA&gt;<br>Portal");
    expect(bugTableExport([], []).rows).toEqual([]);
  });
  it("representa casos y ejecuciones sin detalles internos", () => {
    const testCase: TestCase = {
      id: "TC-1",
      title: "Acceso",
      suite: "",
      status: "Pendiente",
      updated: "Hoy",
      preconditions: "SECRETO",
    };
    const run: TestRun = {
      id: "RUN-1",
      title: "Regresión",
      cases: "3",
      progress: 50,
      status: "En curso",
      owner: "Ana",
    };
    expect(caseTableExport([testCase], []).rows[0]).toEqual([
      "TC-1",
      "Acceso",
      "—",
      "Sin asignar",
      "Pendiente",
      "Hoy",
    ]);
    expect(runTableExport([run], []).rows[0]).toEqual([
      "RUN-1",
      "Regresión",
      "3",
      "50%",
      "En curso",
      "Ana",
    ]);
  });
  it("genera Excel con encabezados y mantiene entradas de usuario como texto", async () => {
    const blob = await createTableExport("xlsx", bugTableExport([bug], []));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.worksheets[0];
    expect(sheet.rowCount).toBe(2);
    expect(sheet.getCell("B1").text).toBe("TÍTULO");
    expect(sheet.getCell("B2").value).toBe("=Título | <QA>\nPortal");
    expect(sheet.getCell("B2").type).toBe(ExcelJS.ValueType.String);
  });
  it("genera PDF y Markdown de las mismas filas", async () => {
    const data = bugTableExport([bug], []);
    const pdf = await createTableExport("pdf", data);
    expect(new TextDecoder().decode(await pdf.arrayBuffer())).toContain("%PDF-");
    expect(await (await createTableExport("md", data)).text()).toBe(tableMarkdown(data));
  });
});
