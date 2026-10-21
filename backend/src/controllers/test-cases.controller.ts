import type { Request, Response } from "express";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, projectFilter, text } from "../validation.js";
import type { CreateTestCaseInput } from "../models/test-case.model.js";

export async function listTestCases(request: Request, response: Response) {
  response.json({ data: await repository(request).listCases(projectFilter(request)) });
}
export async function createTestCase(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({ error: { code: "INVALID_TEST_CASE", message: "projectId, título, suite y pasos válidos son obligatorios." } });
    return;
  }
  response.status(201).json({ data: await repository(request).createCase(body) });
}
function valid(body: unknown): body is CreateTestCaseInput {
  return isRecord(body) && isId(body.projectId) && text(body.title, 200) && text(body.suite, 100)
    && (body.preconditions === undefined || (typeof body.preconditions === "string" && body.preconditions.length <= 10000))
    && (body.steps === undefined || (Array.isArray(body.steps) && body.steps.length <= 100
      && body.steps.every((step) => isRecord(step) && text(step.action, 10000) && text(step.expectedResult, 10000))));
}
