import type { Request, Response } from "express";
import {
  bugPriorities,
  bugStatuses,
  type CreateBugInput,
  type BugStatus,
  type UpdateBugInput,
} from "../models/bug.model.js";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";
import { HttpError } from "../http-error.js";

export async function listBugs(request: Request, response: Response) {
  response.json({ data: await repository(request).listBugs(projectFilter(request)) });
}
export async function deleteBug(request: Request, response: Response) {
  const id = parseReference(request.params.bugId, "BUG");
  const projectId = projectFilter(request);
  if (!id || !projectId)
    throw new HttpError(400, "INVALID_BUG", "Se requiere un bug y proyecto válidos.");
  if (!(await repository(request).deleteBug(id, projectId)))
    throw new HttpError(404, "BUG_NOT_FOUND", "No se encontró el bug en el proyecto indicado.");
  response.status(204).end();
}
export async function createBug(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!isCreateBugInput(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_BUG",
        message: "Título, projectId y prioridad válida son obligatorios.",
      },
    });
    return;
  }
  response.status(201).json({ data: await repository(request).createBug(body) });
}
export async function updateBugStatus(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.bugId, "BUG");
  if (
    !id ||
    !isRecord(body) ||
    !isId(body.projectId) ||
    typeof body.status !== "string" ||
    !bugStatuses.includes(body.status as BugStatus)
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_BUG_STATUS",
        message: "Se requiere un bug válido, projectId y un estado permitido.",
      },
    });
    return;
  }
  const updated = await repository(request).updateBugStatus(
    id,
    body.projectId,
    body.status as BugStatus,
  );
  if (!updated)
    throw new HttpError(404, "BUG_NOT_FOUND", "No se encontró el bug en el proyecto indicado.");
  response.json({ data: updated });
}
export async function updateBug(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.bugId, "BUG");
  if (!id || !isUpdateBugInput(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_BUG",
        message: "projectId, título, prioridad y campos de bug válidos son obligatorios.",
      },
    });
    return;
  }
  const { projectId, ...input } = body;
  const updated = await repository(request).updateBug(id, projectId, input);
  if (!updated)
    throw new HttpError(404, "BUG_NOT_FOUND", "No se encontró el bug en el proyecto indicado.");
  response.json({ data: updated });
}
function isCreateBugInput(input: unknown): input is CreateBugInput {
  return (
    isRecord(input) &&
    isId(input.projectId) &&
    text(input.title, 200) &&
    !("project" in input) &&
    typeof input.priority === "string" &&
    bugPriorities.includes(input.priority as (typeof bugPriorities)[number]) &&
    (input.description === undefined ||
      (typeof input.description === "string" && input.description.length <= 5000)) &&
    (input.assignee === undefined ||
      input.assignee === null ||
      (typeof input.assignee === "string" && input.assignee.length <= 100)) &&
    (input.assigneeUserId === undefined ||
      input.assigneeUserId === null ||
      isId(input.assigneeUserId)) &&
    validTagIds(input.tagIds)
  );
}

function isUpdateBugInput(
  input: unknown,
): input is CreateBugInput & Pick<UpdateBugInput, "status"> {
  return (
    isRecord(input) &&
    isId(input.projectId) &&
    text(input.title, 200) &&
    !("project" in input) &&
    typeof input.priority === "string" &&
    bugPriorities.includes(input.priority as (typeof bugPriorities)[number]) &&
    (input.description === undefined ||
      (typeof input.description === "string" && input.description.length <= 5000)) &&
    (input.assignee === undefined ||
      input.assignee === null ||
      (typeof input.assignee === "string" && input.assignee.length <= 100)) &&
    (input.assigneeUserId === undefined ||
      input.assigneeUserId === null ||
      isId(input.assigneeUserId)) &&
    validTagIds(input.tagIds) &&
    (input.status === undefined || isBugStatus(input.status))
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

function isBugStatus(value: unknown): value is BugStatus {
  return typeof value === "string" && bugStatuses.includes(value as BugStatus);
}
