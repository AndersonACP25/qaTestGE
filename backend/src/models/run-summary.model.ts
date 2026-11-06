import { z } from "zod";
import type { TestRun } from "./test-run.model.js";

const count = z.number().int().nonnegative();
export const runSummaryContext = z.strictObject({
  counts: z.strictObject({
    passed: count,
    failed: count,
    blocked: count,
    skipped: count,
    pending: count,
  }),
  findings: z
    .array(
      z.strictObject({
        caseId: z.string().regex(/^TC-\d{1,19}$/),
        title: z.string().max(200),
        status: z.enum(["failed", "blocked"]),
      }),
    )
    .max(12),
});
export type RunSummaryContext = z.infer<typeof runSummaryContext>;

export function summarizeRunContext(run: TestRun): RunSummaryContext {
  const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, pending: 0 };
  const findings: RunSummaryContext["findings"] = [];
  for (const { executedAt, status, title, caseId } of run.results) {
    counts[executedAt ? status : "pending"]++;
    if (executedAt && (status === "failed" || status === "blocked"))
      findings.push({ caseId, title: title.slice(0, 200), status });
  }
  findings.sort((a, b) => a.caseId.localeCompare(b.caseId, "en"));
  return { counts, findings: findings.slice(0, 12) };
}

export const runSummaryOutput = z.strictObject({ summary: z.string().max(3500).trim().min(1) });
export type RunSummary = z.infer<typeof runSummaryOutput>;
