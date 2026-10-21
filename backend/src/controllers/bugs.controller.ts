import type { Request, Response } from "express";
import { bugPriorities, type CreateBugInput } from "../models/bug.model.js";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, projectFilter, text } from "../validation.js";

export async function listBugs(request: Request, response: Response) {
  response.json({ data: await repository(request).listBugs(projectFilter(request)) });
}
export async function createBug(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!isCreateBugInput(body)) {
    response.status(400).json({ error: { code: "INVALID_BUG", message: "Título, projectId y prioridad válida son obligatorios." } });
    return;
  }
  response.status(201).json({ data: await repository(request).createBug(body) });
}
function isCreateBugInput(input: unknown): input is CreateBugInput {
  return isRecord(input) && isId(input.projectId) && text(input.title, 200)
    && !("project" in input)
    && typeof input.priority === "string" && bugPriorities.includes(input.priority as (typeof bugPriorities)[number])
    && (input.description === undefined || (typeof input.description === "string" && input.description.length <= 5000))
    && (input.assignee === undefined || input.assignee === null || (typeof input.assignee === "string" && input.assignee.length <= 100));
}
