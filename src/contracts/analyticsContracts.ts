import { z } from "zod";
const text = z.string().max(10000),
  id = z.string().min(1).max(120),
  count = z.number().int().nonnegative(),
  rate = count.max(100).nullable();
const summary = z.object({
  bugs: count,
  openBugs: count,
  closedBugs: count,
  cases: count,
  activeCases: count,
  runs: count,
  activeRuns: count,
  completedRuns: count,
  evidence: count,
  recorded: count,
  passed: count,
  failed: count,
  blocked: count,
  skipped: count,
  approvalRate: rate,
  requirements: count,
  coveredRequirements: count,
});
export const analyticsSchema = z.object({
  range: z.object({ from: text, to: text }),
  historySince: text,
  generatedAt: text,
  summary,
  runTrend: z
    .array(
      z.object({
        id,
        title: text,
        createdAt: text,
        recorded: count,
        evaluated: count,
        passed: count,
        failed: count,
        approvalRate: rate,
      }),
    )
    .max(60),
  bugTrend: z
    .array(z.object({ date: text, open: count.nullable(), closed: count.nullable() }))
    .max(366),
  frequentFailures: z
    .array(z.object({ caseId: id, title: text, failures: count, executions: count }))
    .max(10),
  typeCoverage: z.array(z.object({ type: text, total: count, executed: count })).max(1000),
});
export const requirementSchema = z.object({
  id,
  projectId: id,
  code: text,
  title: text,
  description: text,
  caseIds: z.array(id).max(100),
  version: count.min(1),
  createdAt: text,
});
export const requirementsSchema = z.object({
  items: z.array(requirementSchema).max(100),
  total: count,
});
export const coverageSchema = z.object({
  rows: z
    .array(
      z.object({
        requirementId: id,
        code: text,
        title: text,
        caseId: id.nullable(),
        caseTitle: text.nullable(),
        bugId: id.nullable(),
        bugTitle: text.nullable(),
      }),
    )
    .max(100),
  total: count,
  limit: count,
  offset: count,
});
export const runReportSchema = z.object({
  projectName: text,
  generatedAt: text,
  runId: id,
  title: text,
  owner: text,
  status: text,
  createdAt: text,
  summary: z.object({
    total: count,
    recorded: count,
    passed: count,
    failed: count,
    blocked: count,
    skipped: count,
    approvalRate: rate,
  }),
  results: z
    .array(
      z.object({
        id,
        caseId: id,
        title: text,
        caseVersion: count,
        status: z.enum(["passed", "failed", "blocked", "skipped"]),
        notes: text,
        executedAt: text.nullable(),
        steps: z.array(z.object({ action: text, expectedResult: text })),
        bugIds: z.array(id),
        evidence: z.array(z.object({ id, name: text })),
      }),
    )
    .max(1000),
});
export const importResultSchema = z.object({ created: count, existing: count });
export type AnalyticsData = z.output<typeof analyticsSchema>;
export type Requirement = z.output<typeof requirementSchema>;
export type CoveragePage = z.output<typeof coverageSchema>;
export type RunReport = z.output<typeof runReportSchema>;
