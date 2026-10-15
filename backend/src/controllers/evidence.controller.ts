import type { Request, Response } from "express";
import { evidenceTypes } from "../models/evidence.model.js";
import { store } from "../models/in-memory-store.js";

export function listEvidence(_request: Request, response: Response): void {
  response.json({ data: store.evidence });
}

export function createEvidence(request: Request, response: Response): void {
  const body: unknown = request.body;
  if (!isRecord(body)
    || !isNonEmptyString(body.name, 255)
    || typeof body.type !== "string"
    || !evidenceTypes.includes(body.type as (typeof evidenceTypes)[number])
    || typeof body.sizeBytes !== "number"
    || !Number.isSafeInteger(body.sizeBytes)
    || body.sizeBytes < 0
    || (body.related !== undefined
      && body.related !== null
      && (typeof body.related !== "string" || body.related.length > 100))) {
    response.status(400).json({
      error: { code: "INVALID_EVIDENCE", message: "Metadatos válidos de evidencia son obligatorios." },
    });
    return;
  }

  const evidence = {
    id: `EVD-${String(store.nextIds.evidence++).padStart(3, "0")}`,
    name: body.name.trim(),
    type: body.type as (typeof evidenceTypes)[number],
    related: typeof body.related === "string" ? body.related : null,
    sizeBytes: body.sizeBytes,
    createdAt: new Date().toISOString(),
  };

  store.evidence.unshift(evidence);
  response.status(201).json({ data: evidence });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
