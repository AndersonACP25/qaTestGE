import type { Request, Response } from "express";
import { bugPriorities, type CreateBugInput } from "../models/bug.model.js";
import { store } from "../models/in-memory-store.js";

export function listBugs(_request: Request, response: Response): void {
  response.json({ data: store.bugs });
}

export function createBug(request: Request, response: Response): void {
  const body: unknown = request.body;
  if (!isCreateBugInput(body)) {
    response.status(400).json({
      error: { code: "INVALID_BUG", message: "Título, proyecto y prioridad válida son obligatorios." },
    });
    return;
  }

  const bug = {
    id: `BUG-${String(store.nextIds.bug++).padStart(3, "0")}`,
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    project: body.project.trim(),
    priority: body.priority,
    status: "Abierto" as const,
    assignee: body.assignee ?? null,
    createdAt: new Date().toISOString(),
  };

  store.bugs.unshift(bug);
  response.status(201).json({ data: bug });
}

function isCreateBugInput(value: unknown): value is CreateBugInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return typeof input.title === "string"
    && input.title.trim().length > 0
    && input.title.length <= 200
    && typeof input.project === "string"
    && input.project.trim().length > 0
    && input.project.length <= 100
    && typeof input.priority === "string"
    && bugPriorities.includes(input.priority as (typeof bugPriorities)[number])
    && (input.description === undefined
      || (typeof input.description === "string" && input.description.length <= 5000))
    && (input.assignee === undefined
      || input.assignee === null
      || (typeof input.assignee === "string" && input.assignee.length <= 100));
}
