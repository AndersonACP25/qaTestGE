import type { Bug, CaseStatus, Evidence, TestCase, TestRun } from "../types";
import type { ResultStatus } from "../../backend/src/models/test-run.model";

export interface ReportMetrics {
  openBugs: number;
  resolvedBugs: number;
  casesByStatus: Record<CaseStatus, number>;
  completedRuns: number;
  activeRuns: number;
  averageRunProgress: number;
  evidenceCount: number;
  resultsByStatus: Record<ResultStatus, number>;
  recordedResults: number;
  approvalRate: number;
}

export function calculateReportMetrics(
  bugs: Bug[],
  cases: TestCase[],
  runs: TestRun[],
  evidence: Evidence[],
  closedStates: readonly string[] = ["Resuelto"],
): ReportMetrics {
  const casesByStatus: Record<CaseStatus, number> = {
    Pendiente: 0,
    Aprobado: 0,
    Fallido: 0,
  };
  for (const testCase of cases) casesByStatus[testCase.status] += 1;

  const resultsByStatus: Record<ResultStatus, number> = {
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };
  for (const run of runs) {
    for (const result of run.results ?? []) {
      if (result.executedAt) resultsByStatus[result.status] += 1;
    }
  }

  const recordedResults = Object.values(resultsByStatus).reduce((total, count) => total + count, 0);
  const evaluatedResults =
    resultsByStatus.passed + resultsByStatus.failed + resultsByStatus.blocked;

  return {
    openBugs: bugs.filter((bug) => !closedStates.includes(bug.status)).length,
    resolvedBugs: bugs.length - bugs.filter((bug) => !closedStates.includes(bug.status)).length,
    casesByStatus,
    completedRuns: runs.filter((run) => run.status === "Completado").length,
    activeRuns: runs.filter((run) => run.status === "En curso").length,
    averageRunProgress: runs.length
      ? Math.round(runs.reduce((total, run) => total + run.progress, 0) / runs.length)
      : 0,
    evidenceCount: evidence.length,
    resultsByStatus,
    recordedResults,
    approvalRate: evaluatedResults
      ? Math.round((resultsByStatus.passed / evaluatedResults) * 100)
      : 0,
  };
}
