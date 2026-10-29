import { describe, expect, it } from "vitest";
import { calculateReportMetrics } from "../../src/models/reportMetrics";
import type { Bug, Evidence, TestCase, TestRun } from "../../src/types";

function bug(id: string, status: Bug["status"]): Bug {
  return {
    id,
    title: `Bug ${id}`,
    project: "Proyecto",
    priority: "Media",
    status,
    assignee: "QA",
    color: "blue",
    updated: "2026-10-27",
  };
}

function testCase(id: string, status: TestCase["status"]): TestCase {
  return { id, title: `Caso ${id}`, suite: "", status, updated: "2026-10-27" };
}

function evidence(id: string): Evidence {
  return {
    id,
    projectId: "1",
    name: `Archivo ${id}`,
    type: "Imagen",
    related: "TC-1",
    size: "1 KB",
    sizeBytes: 1024,
    hasFile: true,
    date: "2026-10-27",
    createdAt: "2026-10-27T12:00:00Z",
  };
}

const run: TestRun = {
  id: "RUN-1",
  title: "Regresión",
  cases: "3 casos",
  progress: 50,
  status: "En curso",
  owner: "QA",
  results: [
    {
      id: "1",
      caseId: "TC-1",
      title: "Inicio",
      status: "passed",
      notes: "",
      executedAt: "2026-10-27T12:00:00Z",
      steps: [],
    },
    {
      id: "2",
      caseId: "TC-2",
      title: "Pago",
      status: "failed",
      notes: "",
      executedAt: "2026-10-27T12:00:00Z",
      steps: [],
    },
    {
      id: "3",
      caseId: "TC-3",
      title: "Reporte",
      status: "skipped",
      notes: "",
      executedAt: "2026-10-27T12:00:00Z",
      steps: [],
    },
    {
      id: "4",
      caseId: "TC-4",
      title: "Exportar",
      status: "blocked",
      notes: "",
      executedAt: null,
      steps: [],
    },
  ],
};

describe("métricas de reportes", () => {
  it("resume registros reales y excluye resultados aún no ejecutados de la aprobación", () => {
    const metrics = calculateReportMetrics(
      [bug("BUG-1", "Abierto"), bug("BUG-2", "Resuelto")],
      [testCase("TC-1", "Aprobado"), testCase("TC-2", "Fallido")],
      [run, { ...run, id: "RUN-2", status: "Completado", progress: 100 }],
      [evidence("EVD-1")],
    );

    expect(metrics).toMatchObject({
      openBugs: 1,
      resolvedBugs: 1,
      casesByStatus: { Pendiente: 0, Aprobado: 1, Fallido: 1 },
      completedRuns: 1,
      activeRuns: 1,
      averageRunProgress: 75,
      evidenceCount: 1,
      resultsByStatus: { passed: 2, failed: 2, blocked: 0, skipped: 2 },
      recordedResults: 6,
      approvalRate: 50,
    });
  });

  it("devuelve métricas vacías sin dividir entre cero", () => {
    expect(calculateReportMetrics([], [], [], [])).toMatchObject({
      openBugs: 0,
      resolvedBugs: 0,
      averageRunProgress: 0,
      recordedResults: 0,
      approvalRate: 0,
    });
  });
});
