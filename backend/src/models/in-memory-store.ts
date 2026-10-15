import type { Bug } from "./bug.model.js";
import type { TestCase } from "./test-case.model.js";
import type { TestRun } from "./test-run.model.js";
import type { Evidence } from "./evidence.model.js";

export const store: {
  bugs: Bug[];
  testCases: TestCase[];
  testRuns: TestRun[];
  evidence: Evidence[];
  nextIds: { bug: number; testCase: number; testRun: number; evidence: number };
} = {
  bugs: [],
  testCases: [],
  testRuns: [],
  evidence: [],
  nextIds: { bug: 1, testCase: 1, testRun: 1, evidence: 1 },
};

export function resetStore(): void {
  store.bugs = [];
  store.testCases = [];
  store.testRuns = [];
  store.evidence = [];
  store.nextIds = { bug: 1, testCase: 1, testRun: 1, evidence: 1 };
}
