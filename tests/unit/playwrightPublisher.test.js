import { describe, expect, it } from "vitest";
import { collectResults } from "../../servicios/playwright/publish.mjs";

const testResult = (statuses, fields = {}) => ({
  projectName: "chromium",
  results: statuses.map((status) => ({ status })),
  ...fields,
});
const report = (specs) => ({ suites: [{ suites: [{ specs }] }] });

describe("publicador de Playwright", () => {
  it("conserva reintentos y cuenta pruebas sin ID solo del proyecto elegido", () => {
    const input = report([
      { title: "[TC-01] Login", tests: [testResult(["failed", "passed"])] },
      {
        title: "Logout",
        tests: [
          testResult([], {
            expectedStatus: "skipped",
            annotations: [{ type: "qatestge", description: "TC-002" }],
          }),
        ],
      },
      {
        title: "Sin ID",
        tests: [testResult(["passed"]), testResult(["passed"], { projectName: "firefox" })],
      },
    ]);
    expect(collectResults(input, "chromium")).toEqual({
      results: [
        { caseId: "TC-001", attempts: ["failed", "passed"] },
        { caseId: "TC-002", attempts: ["skipped"] },
      ],
      unmappedCount: 1,
    });
  });

  it("rechaza dos pruebas que apuntan al mismo caso", () => {
    const input = report([
      { title: "[TC-01] Primero", tests: [testResult(["failed"])] },
      { title: "[TC-001] Segundo", tests: [testResult(["passed"])] },
    ]);
    expect(() => collectResults(input, "chromium")).toThrow("Asignación ambigua");
  });
});
