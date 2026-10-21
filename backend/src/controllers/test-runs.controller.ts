import type { Request, Response } from "express";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";
import type { CreateTestRunInput } from "../models/test-run.model.js";

export async function listTestRuns(request: Request, response: Response) {
  response.json({ data: await repository(request).listRuns(projectFilter(request)) });
}
export async function createTestRun(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({ error: { code: "INVALID_TEST_RUN", message: "projectId, título, responsable y referencias válidas son obligatorios; usa caseIds en lugar de caseCount." } });
    return;
  }
  response.status(201).json({ data: await repository(request).createRun(body) });
}
function valid(body: unknown): body is CreateTestRunInput {
  if (!isRecord(body) || !isId(body.projectId) || !text(body.title, 200) || !text(body.owner, 100) || "caseCount" in body) return false;
  if (body.caseIds === undefined) return true;
  if (!Array.isArray(body.caseIds) || body.caseIds.length > 1000) return false;
  const ids = body.caseIds.map((id) => parseReference(id, "TC"));
  return ids.every((id) => id !== null) && new Set(ids).size === ids.length;
}
