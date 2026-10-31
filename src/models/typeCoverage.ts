import type { TestCase, TestRun } from "../types";
export function typeCoverage(cases: TestCase[], runs: TestRun[]) {
  const executed = new Set(
    runs.flatMap((r) => (r.results ?? []).filter((v) => v.executedAt).map((v) => v.caseId)),
  );
  const counts = new Map<string, { type: string; total: number; executed: number }>();
  for (const c of cases.filter((c) => c.lifecycle !== "Obsoleto")) {
    const type = c.testType ?? "Funcional";
    const count = counts.get(type) ?? { type, total: 0, executed: 0 };
    count.total++;
    if (executed.has(c.id)) count.executed++;
    counts.set(type, count);
  }
  return [...counts.values()].sort((a, b) => a.type.localeCompare(b.type, "es"));
}
