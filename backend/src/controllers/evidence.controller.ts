import type { Request, Response } from "express";
import { evidenceTypes, type CreateEvidenceInput } from "../models/evidence.model.js";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";

export async function listEvidence(request: Request, response: Response) {
  response.json({ data: await repository(request).listEvidence(projectFilter(request)) });
}
export async function createEvidence(request: Request, response: Response) {
  const body: unknown = request.body;
  if (!valid(body)) {
    response.status(400).json({ error: { code: "INVALID_EVIDENCE", message: "projectId y metadatos válidos son obligatorios; related debe referenciar BUG, TC, RUN o RES." } });
    return;
  }
  response.status(201).json({ data: await repository(request).createEvidence(body) });
}
function valid(body: unknown): body is CreateEvidenceInput {
  return isRecord(body) && isId(body.projectId) && text(body.name, 255)
    && typeof body.type === "string" && evidenceTypes.includes(body.type as (typeof evidenceTypes)[number])
    && typeof body.sizeBytes === "number" && Number.isSafeInteger(body.sizeBytes) && body.sizeBytes >= 0
    && (body.related === undefined || body.related === null
      || ["BUG", "TC", "RUN", "RES"].some((prefix) => parseReference(body.related, prefix) !== null));
}
