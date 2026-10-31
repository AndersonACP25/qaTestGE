import type { CreationContext } from "../repositories/creation-request.js";
export interface AnalyticsRange {
  from: string;
  to: string;
}
export interface AnalyticsData {
  range: AnalyticsRange;
  historySince: string;
  generatedAt: string;
  summary: {
    bugs: number;
    openBugs: number;
    closedBugs: number;
    cases: number;
    activeCases: number;
    runs: number;
    activeRuns: number;
    completedRuns: number;
    evidence: number;
    recorded: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    approvalRate: number | null;
    requirements: number;
    coveredRequirements: number;
  };
  runTrend: {
    id: string;
    title: string;
    createdAt: string;
    recorded: number;
    evaluated: number;
    passed: number;
    failed: number;
    approvalRate: number | null;
  }[];
  bugTrend: { date: string; open: number | null; closed: number | null }[];
  frequentFailures: { caseId: string; title: string; failures: number; executions: number }[];
  typeCoverage: { type: string; total: number; executed: number }[];
}
export interface RequirementInput {
  code: string;
  title: string;
  description: string;
  caseIds: string[];
  version?: number;
}
export interface Requirement {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description: string;
  caseIds: string[];
  version: number;
  createdAt: string;
}
export interface CoverageRow {
  requirementId: string;
  code: string;
  title: string;
  caseId: string | null;
  caseTitle: string | null;
  bugId: string | null;
  bugTitle: string | null;
}
export interface CoveragePage {
  rows: CoverageRow[];
  total: number;
  limit: number;
  offset: number;
}
export interface RunReport {
  projectName: string;
  generatedAt: string;
  runId: string;
  title: string;
  owner: string;
  status: string;
  createdAt: string;
  summary: {
    total: number;
    recorded: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    approvalRate: number | null;
  };
  results: {
    id: string;
    caseId: string;
    title: string;
    caseVersion: number;
    status: string;
    notes: string;
    executedAt: string | null;
    steps: { action: string; expectedResult: string }[];
    bugIds: string[];
    evidence: { id: string; name: string }[];
  }[];
}
export interface AnalyticsRepository {
  overview(projectId: string, range: AnalyticsRange): Promise<AnalyticsData>;
  requirements(
    projectId: string,
    limit: number,
    offset: number,
    search: string,
  ): Promise<{ items: Requirement[]; total: number }>;
  saveRequirement(
    projectId: string,
    id: string | null,
    input: RequirementInput,
    context?: CreationContext,
  ): Promise<Requirement>;
  deleteRequirement(projectId: string, id: string, version: number): Promise<void>;
  linkCaseBug(
    projectId: string,
    requirementId: string,
    caseId: string,
    bugId: string,
  ): Promise<void>;
  coverage(
    projectId: string,
    limit: number,
    offset: number,
    requirementId?: string,
  ): Promise<CoveragePage>;
  runReport(projectId: string, id: string): Promise<RunReport>;
  importTags(
    projectId: string,
    rows: { name: string; color: string }[],
    context: CreationContext,
  ): Promise<{ created: number; existing: number }>;
}
