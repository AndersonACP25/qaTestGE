import type { Request, Response } from "express";
import {
  evidenceTypes,
  type CreateEvidenceInput,
  type UpdateEvidenceInput,
} from "../models/evidence.model.js";
import { HttpError } from "../http-error.js";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";

export async function listEvidence(request: Request, response: Response) {
  response.json({ data: await repository(request).listEvidence(projectFilter(request)) });
}
export async function createEvidence(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE",
        message:
          "projectId y metadatos válidos son obligatorios; related debe referenciar BUG, TC, RUN o RES.",
      },
    });
    return;
  }
  response.status(201).json({ data: await repository(request).createEvidence(body) });
}
export async function updateEvidence(request: Request, response: Response) {
  const body: unknown = request.body;
  const id = parseReference(request.params.evidenceId, "EVD");
  if (!id || !isRecord(body) || !isId(body.projectId) || !validFields(body)) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE",
        message: "projectId y metadatos válidos son obligatorios.",
      },
    });
    return;
  }
  const { projectId, ...input } = body;
  const updated = await repository(request).updateEvidence(id, projectId, input);
  if (!updated) {
    response.status(404).json({
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: "No se encontró la evidencia en el proyecto indicado.",
      },
    });
    return;
  }
  response.json({ data: updated });
}
export async function deleteEvidence(request: Request, response: Response) {
  const id = parseReference(request.params.evidenceId, "EVD");
  const projectId = projectFilter(request);
  if (!id || !projectId) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE",
        message: "Se requiere una evidencia y projectId válidos.",
      },
    });
    return;
  }
  if (!(await repository(request).deleteEvidence(id, projectId))) {
    response.status(404).json({
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: "No se encontró la evidencia en el proyecto indicado.",
      },
    });
    return;
  }
  response.status(204).end();
}
export async function uploadEvidenceFile(request: Request, response: Response) {
  const body: unknown = request.body;
  const projectId = request.query.projectId;
  const name = request.query.name;
  const related = request.query.related;
  const mediaType = request.get("content-type")?.toLowerCase().split(";")[0].trim();
  if (
    !isId(projectId) ||
    !text(name, 255) ||
    !(body instanceof Buffer) ||
    body.length === 0 ||
    body.length > 2 * 1024 * 1024 ||
    !validMediaType(mediaType) ||
    (related !== undefined && related !== "" && !isValidRelated(related))
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE_FILE",
        message: "El archivo debe tener nombre y tipo válidos y pesar como máximo 2 MiB.",
      },
    });
    return;
  }
  const saved = await repository(request).saveEvidenceFile(
    null,
    projectId,
    {
      name,
      mediaType,
      fileData: body,
    },
    typeof related === "string" && related ? related : null,
  );
  if (!saved) throw new HttpError(500, "EVIDENCE_SAVE_FAILED", "No se pudo guardar la evidencia.");
  response.status(201).json({ data: saved });
}

export async function replaceEvidenceFile(request: Request, response: Response) {
  const id = parseReference(request.params.evidenceId, "EVD");
  const body: unknown = request.body;
  const projectId = request.query.projectId;
  const name = request.query.name;
  const mediaType = request.get("content-type")?.toLowerCase().split(";")[0].trim();
  if (
    !id ||
    !isId(projectId) ||
    !text(name, 255) ||
    !(body instanceof Buffer) ||
    body.length === 0 ||
    body.length > 2 * 1024 * 1024 ||
    !validMediaType(mediaType)
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE_FILE",
        message: "El archivo debe tener nombre y tipo válidos y pesar como máximo 2 MiB.",
      },
    });
    return;
  }
  const saved = await repository(request).saveEvidenceFile(id, projectId, {
    name,
    mediaType,
    fileData: body,
  });
  if (!saved) {
    response.status(404).json({
      error: { code: "EVIDENCE_NOT_FOUND", message: "No se encontró la evidencia indicada." },
    });
    return;
  }
  response.json({ data: saved });
}

export async function downloadEvidenceFile(request: Request, response: Response) {
  const id = parseReference(request.params.evidenceId, "EVD");
  const projectId = projectFilter(request);
  if (!id || !projectId) {
    response.status(400).json({
      error: {
        code: "INVALID_EVIDENCE",
        message: "Se requiere una evidencia y projectId válidos.",
      },
    });
    return;
  }
  const file = await repository(request).getEvidenceFile(id, projectId);
  if (!file) {
    response.status(404).json({
      error: {
        code: "EVIDENCE_FILE_NOT_FOUND",
        message: "No hay un archivo disponible para esta evidencia.",
      },
    });
    return;
  }
  const encodedName = encodeURIComponent(file.name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);
  response.type("application/octet-stream").send(file.fileData);
}
function valid(body: unknown): body is CreateEvidenceInput {
  return isRecord(body) && isId(body.projectId) && validFields(body);
}

function validFields(
  body: Record<string, unknown>,
): body is Record<string, unknown> & UpdateEvidenceInput {
  return (
    text(body.name, 255) &&
    typeof body.type === "string" &&
    evidenceTypes.includes(body.type as (typeof evidenceTypes)[number]) &&
    typeof body.sizeBytes === "number" &&
    Number.isSafeInteger(body.sizeBytes) &&
    body.sizeBytes >= 0 &&
    (body.related === undefined ||
      body.related === null ||
      ["BUG", "TC", "RUN", "RES"].some((prefix) => parseReference(body.related, prefix) !== null))
  );
}

function validMediaType(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= 127 && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(value)
  );
}

function isValidRelated(value: unknown): value is string {
  return ["BUG", "TC", "RUN", "RES"].some((prefix) => parseReference(value, prefix) !== null);
}
