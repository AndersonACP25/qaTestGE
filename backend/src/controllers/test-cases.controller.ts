import type { Request, Response } from "express";
import { store } from "../models/in-memory-store.js";

export function listTestCases(_request: Request, response: Response): void {
  response.json({ data: store.testCases });
}

export function createTestCase(request: Request, response: Response): void {
  const body: unknown = request.body;
  if (!isRecord(body) || !isNonEmptyString(body.title, 200) || !isNonEmptyString(body.suite, 100)) {
    response.status(400).json({
      error: { code: "INVALID_TEST_CASE", message: "Título y suite son obligatorios." },
    });
    return;
  }

  const testCase = {
    id: `TC-${String(store.nextIds.testCase++).padStart(3, "0")}`,
    title: body.title.trim(),
    suite: body.suite.trim(),
    status: "Pendiente" as const,
    createdAt: new Date().toISOString(),
  };

  store.testCases.unshift(testCase);
  response.status(201).json({ data: testCase });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
