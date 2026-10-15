import type { Request, Response } from "express";
import { store } from "../models/in-memory-store.js";

export function listTestRuns(_request: Request, response: Response): void {
  response.json({ data: store.testRuns });
}

export function createTestRun(request: Request, response: Response): void {
  const body: unknown = request.body;
  if (!isRecord(body)
    || !isNonEmptyString(body.title, 200)
    || !isNonEmptyString(body.owner, 100)
    || (body.caseCount !== undefined
      && (typeof body.caseCount !== "number" || !Number.isInteger(body.caseCount) || body.caseCount < 0))) {
    response.status(400).json({
      error: { code: "INVALID_TEST_RUN", message: "Título y responsable válidos son obligatorios." },
    });
    return;
  }

  const testRun = {
    id: `RUN-${String(store.nextIds.testRun++).padStart(3, "0")}`,
    title: body.title.trim(),
    caseCount: typeof body.caseCount === "number" ? body.caseCount : 0,
    progress: 0,
    status: "En curso" as const,
    owner: body.owner.trim(),
    createdAt: new Date().toISOString(),
  };

  store.testRuns.unshift(testRun);
  response.status(201).json({ data: testRun });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
