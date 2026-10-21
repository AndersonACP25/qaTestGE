import type { Request, Response } from "express";
import { evidenceTypes, type CreateEvidenceInput, type UpdateEvidenceInput } from "../models/evidence.model.js";
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
    response.status(400).json({ error: { code: "INVALID_EVIDENCE", message: "projectId y metadatos válidos son obligatorios." } });
    return;
  }
  const { projectId, ...input } = body;
  const updated = await repository(request).updateEvidence(id, projectId, input);
  if (!updated) {
    response.status(404).json({ error: { code: "EVIDENCE_NOT_FOUND", message: "No se encontró la evidencia en el proyecto indicado." } });
    return;
  }
  response.json({ data: updated });
}
export async function deleteEvidence(request: Request, response: Response) {
  const id = parseReference(request.params.evidenceId, "EVD");
  const projectId = projectFilter(request);
  if (!id || !projectId) {
    response.status(400).json({ error: { code: "INVALID_EVIDENCE", message: "Se requiere una evidencia y projectId válidos." } });
    return;
  }
  if (!await repository(request).deleteEvidence(id, projectId)) {
    response.status(404).json({ error: { code: "EVIDENCE_NOT_FOUND", message: "No se encontró la evidencia en el proyecto indicado." } });
    return;
  }
  response.status(204).end();
}
function valid(body: unknown): body is CreateEvidenceInput {
  return (
    isRecord(body) &&
    isId(body.projectId) &&
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
