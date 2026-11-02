import { creationContext } from "../repositories/creation-request.js";
import { listQuery } from "../repositories/list-query.js";
import type { Request, Response } from "express";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";
import {
  resultStatuses,
  testRunStatuses,
  type CreateTestRunInput,
  type ResultStatus,
  type TestRunStatus,
} from "../models/test-run.model.js";
import { HttpError } from "../http-error.js";

export async function listTestRuns(request: Request, response: Response) {
  response.json({
    data: await repository(request).listRuns(
      projectFilter(request),
      listQuery(request, ["En curso", "Completado"]),
    ),
  });
}
export async function createTestRun(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_TEST_RUN",
        message:
          "projectId, título, responsable y referencias válidas son obligatorios; usa caseIds en lugar de caseCount.",
      },
    });
    return;
  }
  response
    .status(201)
    .json({ data: await repository(request).createRun(body, creationContext(request, response)) });
}
function valid(body: unknown): body is CreateTestRunInput {
  if (
    !isRecord(body) ||
    !isId(body.projectId) ||
    !text(body.title, 200) ||
    !text(body.owner, 100) ||
    "caseCount" in body
  )
    return false;
  if (!validTagIds(body.tagIds)) return false;
  if (body.ownerUserId !== undefined && body.ownerUserId !== null && !isId(body.ownerUserId))
    return false;
  if (body.planId !== undefined && !parseReference(body.planId, "PLAN")) return false;
  if (body.sourceRunId !== undefined && !parseReference(body.sourceRunId, "RUN")) return false;
  if (body.failedOnly !== undefined && typeof body.failedOnly !== "boolean") return false;
  if (body.failedOnly && !body.sourceRunId) return false;
  if (body.caseIds === undefined) return true;
  if (!Array.isArray(body.caseIds) || body.caseIds.length > 1000) return false;
  const ids = body.caseIds.map((id) => parseReference(id, "TC"));
  return ids.every((id) => id !== null) && new Set(ids).size === ids.length;
}

export async function updateTestRun(request: Request, response: Response) {
  const body: unknown = request.body;
  const status = isRecord(body) ? body.status : undefined;
  const id = parseReference(request.params.runId, "RUN");
  if (
    !id ||
    !valid(body) ||
    !isRecord(body) ||
    !Array.isArray(body.caseIds) ||
    !testRunStatuses.includes(status as TestRunStatus)
  )
    throw new HttpError(
      400,
      "INVALID_TEST_RUN",
      "Indica proyecto, título, responsable, casos y estado válidos.",
    );
  const { projectId, ...input } = body;
  const updated = await repository(request).updateRun(id, projectId, {
    ...input,
    caseIds: body.caseIds as string[],
    status: status as TestRunStatus,
  });
  if (!updated)
    throw new HttpError(404, "TEST_RUN_NOT_FOUND", "Ejecución no encontrada en el proyecto.");
  response.json({ data: updated });
}
export async function deleteTestRun(request: Request, response: Response) {
  const id = parseReference(request.params.runId, "RUN");
  const projectId = projectFilter(request);
  if (!id || !projectId)
    throw new HttpError(400, "INVALID_TEST_RUN", "Indica ejecución y proyecto válidos.");
  if (!(await repository(request).deleteRun(id, projectId)))
    throw new HttpError(404, "TEST_RUN_NOT_FOUND", "Ejecución no encontrada en el proyecto.");
  response.status(204).end();
}
export async function updateTestRunResult(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.runId, "RUN");
  const resultId = parseReference(request.params.resultId, "RES");
  if (
    !id ||
    !resultId ||
    !isRecord(body) ||
    !isId(body.projectId) ||
    !resultStatuses.includes(body.status as ResultStatus) ||
    typeof body.notes !== "string" ||
    body.notes.length > 10000
  )
    throw new HttpError(
      400,
      "INVALID_RUN_RESULT",
      "Indica proyecto, resultado, estado y notas válidos (máximo 10000 caracteres).",
    );
  const updated = await repository(request).updateRunResult(id, resultId, body.projectId, {
    status: body.status as ResultStatus,
    notes: body.notes,
  });
  if (!updated)
    throw new HttpError(
      404,
      "RUN_RESULT_NOT_FOUND",
      "Resultado no encontrado en esta ejecución y proyecto.",
    );
  response.json({ data: updated });
}

function validTagIds(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.length <= 100 &&
      value.every(isId) &&
      new Set(value).size === value.length)
  );
}
