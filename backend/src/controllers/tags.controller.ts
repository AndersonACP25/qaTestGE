import type { Request, Response } from "express";
import { HttpError } from "../http-error.js";
import { isId, isRecord, projectFilter, text } from "../validation.js";
import { repository } from "../repositories/repository.js";

const colorPattern = /^#[\da-f]{6}$/i;

export async function listTags(request: Request, response: Response) {
  const projectId = projectFilter(request);
  if (!projectId) {
    response.status(400).json({
      error: { code: "PROJECT_REQUIRED", message: "Indica el projectId para consultar los tags." },
    });
    return;
  }
  response.json({ data: await repository(request).listTags(projectId) });
}

export async function createTag(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body) || !isId(body.projectId)) {
    response.status(400).json({
      error: {
        code: "INVALID_TAG",
        message: "projectId, nombre y color hexadecimal son obligatorios.",
      },
    });
    return;
  }
  response.status(201).json({ data: await repository(request).createTag(body) });
}

export async function updateTag(request: Request, response: Response) {
  const { tagId } = request.params;
  const body: unknown = request.body;
  if (!isId(tagId) || !isRecord(body) || !isId(body.projectId) || !valid(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_TAG",
        message: "Se requiere un tag, projectId, nombre y color válidos.",
      },
    });
    return;
  }
  const { projectId, name, color } = body;
  const updated = await repository(request).updateTag(tagId, projectId, { name, color });
  if (!updated)
    throw new HttpError(404, "TAG_NOT_FOUND", "No se encontró el tag en el proyecto indicado.");
  response.json({ data: updated });
}

export async function deleteTag(request: Request, response: Response) {
  const tagId = request.params.tagId;
  const projectId = projectFilter(request);
  if (!isId(tagId) || !projectId) {
    response.status(400).json({
      error: { code: "INVALID_TAG", message: "Se requiere un tag y projectId válidos." },
    });
    return;
  }
  if (!(await repository(request).deleteTag(tagId, projectId)))
    throw new HttpError(404, "TAG_NOT_FOUND", "No se encontró el tag en el proyecto indicado.");
  response.status(204).end();
}

function valid(body: unknown): body is { projectId: string; name: string; color: string } {
  return (
    isRecord(body) &&
    isId(body.projectId) &&
    text(body.name, 50) &&
    typeof body.color === "string" &&
    colorPattern.test(body.color)
  );
}
