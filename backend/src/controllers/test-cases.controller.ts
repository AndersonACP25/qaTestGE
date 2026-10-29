import { creationContext } from "../repositories/creation-request.js";
import { listQuery } from "../repositories/list-query.js";
import type { Request, Response } from "express";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";
import {
  testCaseStatuses,
  type CreateTestCaseInput,
  type TestCaseStatus,
} from "../models/test-case.model.js";
import { HttpError } from "../http-error.js";

export async function listTestCases(request: Request, response: Response) {
  response.json({
    data: await repository(request).listCases(
      projectFilter(request),
      listQuery(request, ["Pendiente", "Aprobado", "Fallido"]),
    ),
  });
}
export async function createTestCase(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_TEST_CASE",
        message: "projectId, título y pasos válidos son obligatorios.",
      },
    });
    return;
  }
  response
    .status(201)
    .json({ data: await repository(request).createCase(body, creationContext(request, response)) });
}
export async function updateTestCase(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.caseId, "TC");
  if (!id || !isRecord(body) || !isId(body.projectId) || !validCaseFields(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_TEST_CASE",
        message: "projectId, título y pasos válidos son obligatorios.",
      },
    });
    return;
  }
  const { projectId, ...input } = body;
  const updated = await repository(request).updateCase(id, projectId, input);
  if (!updated)
    throw new HttpError(
      404,
      "TEST_CASE_NOT_FOUND",
      "No se encontró el caso de prueba en el proyecto indicado.",
    );
  response.json({ data: updated });
}
export async function deleteTestCase(request: Request, response: Response) {
  const id = parseReference(request.params.caseId, "TC");
  const projectId = projectFilter(request);
  if (!id || !projectId) {
    response.status(400).json({
      error: {
        code: "INVALID_TEST_CASE",
        message: "Se requiere un identificador de caso y projectId válidos.",
      },
    });
    return;
  }
  if (!(await repository(request).deleteCase(id, projectId)))
    throw new HttpError(
      404,
      "TEST_CASE_NOT_FOUND",
      "No se encontró el caso de prueba en el proyecto indicado.",
    );
  response.status(204).end();
}
export async function updateTestCaseStatus(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.caseId, "TC");
  if (
    !id ||
    !isRecord(body) ||
    !isId(body.projectId) ||
    typeof body.status !== "string" ||
    !testCaseStatuses.includes(body.status as TestCaseStatus)
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_TEST_CASE_STATUS",
        message: "Se requiere un caso válido, projectId y un estado permitido.",
      },
    });
    return;
  }
  const updated = await repository(request).updateCaseStatus(
    id,
    body.projectId,
    body.status as TestCaseStatus,
  );
  if (!updated)
    throw new HttpError(
      404,
      "TEST_CASE_NOT_FOUND",
      "No se encontró el caso de prueba en el proyecto indicado.",
    );
  response.json({ data: updated });
}
function valid(body: unknown): body is CreateTestCaseInput {
  return isRecord(body) && isId(body.projectId) && validCaseFields(body);
}
function validCaseFields(
  body: Record<string, unknown>,
): body is Record<string, unknown> & CreateTestCaseInput {
  return (
    text(body.title, 200) &&
    (body.assigneeUserId === undefined ||
      body.assigneeUserId === null ||
      isId(body.assigneeUserId)) &&
    validTagIds(body.tagIds) &&
    (body.suite === undefined ||
      body.suite === null ||
      body.suite === "" ||
      text(body.suite, 100)) &&
    (body.preconditions === undefined ||
      (typeof body.preconditions === "string" && body.preconditions.length <= 10000)) &&
    (body.steps === undefined ||
      (Array.isArray(body.steps) &&
        body.steps.length <= 100 &&
        body.steps.every(
          (step) => isRecord(step) && text(step.action, 10000) && text(step.expectedResult, 10000),
        )))
  );
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
