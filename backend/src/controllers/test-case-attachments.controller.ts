import type { Request, Response } from "express";
import { HttpError } from "../http-error.js";
import { repository } from "../repositories/repository.js";
import { isId, isRecord, parseReference, projectFilter, text } from "../validation.js";

type ImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export async function listCaseAttachments(request: Request, response: Response) {
  const caseId = parseReference(request.params.caseId, "TC");
  const projectId = projectFilter(request);
  if (!caseId || !projectId)
    throw new HttpError(400, "INVALID_ATTACHMENT_REFERENCE", "Caso o proyecto inválido.");
  response.json({ data: await repository(request).listCaseAttachments(caseId, projectId) });
}

export async function createCaseLink(request: Request, response: Response) {
  const caseId = parseReference(request.params.caseId, "TC");
  const body: unknown = request.body;
  if (
    !caseId ||
    !isRecord(body) ||
    !isId(body.projectId) ||
    !text(body.name, 255) ||
    !validUrl(body.url)
  ) {
    throw new HttpError(
      400,
      "INVALID_CASE_LINK",
      "El nombre y un enlace HTTP o HTTPS válido son obligatorios.",
    );
  }
  const attachment = await repository(request).createCaseAttachment({
    projectId: body.projectId,
    testCaseId: caseId,
    kind: "link",
    name: body.name.trim(),
    url: body.url,
  });
  if (!attachment)
    throw new HttpError(
      404,
      "TEST_CASE_NOT_FOUND",
      "No se encontró el caso de prueba en el proyecto indicado.",
    );
  response.status(201).json({ data: attachment });
}

export async function uploadCaseImage(request: Request, response: Response) {
  const caseId = parseReference(request.params.caseId, "TC");
  const projectId = request.query.projectId;
  const name = request.query.name;
  const mediaType = request.get("content-type")?.toLowerCase().split(";")[0].trim();
  const bytes: unknown = request.body;
  if (
    !caseId ||
    !isId(projectId) ||
    !text(name, 255) ||
    !(bytes instanceof Buffer) ||
    bytes.length === 0 ||
    bytes.length > 2 * 1024 * 1024
  ) {
    throw new HttpError(
      400,
      "INVALID_CASE_IMAGE",
      "La imagen debe tener nombre y pesar como máximo 2 MB.",
    );
  }
  const detectedType = detectImageType(bytes);
  if (!detectedType || mediaType !== detectedType) {
    throw new HttpError(
      400,
      "INVALID_CASE_IMAGE",
      "El contenido debe ser una imagen PNG, JPEG, GIF o WebP válida.",
    );
  }
  const attachment = await repository(request).createCaseAttachment({
    projectId,
    testCaseId: caseId,
    kind: "image",
    name: name.trim(),
    mediaType: detectedType,
    imageData: bytes,
  });
  if (!attachment)
    throw new HttpError(
      404,
      "TEST_CASE_NOT_FOUND",
      "No se encontró el caso de prueba en el proyecto indicado.",
    );
  response.status(201).json({ data: attachment });
}

export async function getCaseImage(request: Request, response: Response) {
  const caseId = parseReference(request.params.caseId, "TC");
  const attachmentId = parseReference(request.params.attachmentId, "TCA");
  const projectId = projectFilter(request);
  if (!caseId || !attachmentId || !projectId)
    throw new HttpError(400, "INVALID_ATTACHMENT_REFERENCE", "Referencia de imagen inválida.");
  const attachment = await repository(request).getCaseAttachment(caseId, attachmentId, projectId);
  if (
    !attachment ||
    attachment.kind !== "image" ||
    !attachment.imageData ||
    !attachment.mediaType
  ) {
    throw new HttpError(404, "CASE_IMAGE_NOT_FOUND", "No se encontró la imagen del caso indicado.");
  }
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  response.type(attachment.mediaType).send(attachment.imageData);
}

export async function deleteCaseAttachment(request: Request, response: Response) {
  const caseId = parseReference(request.params.caseId, "TC");
  const attachmentId = parseReference(request.params.attachmentId, "TCA");
  const projectId = projectFilter(request);
  if (!caseId || !attachmentId || !projectId)
    throw new HttpError(400, "INVALID_ATTACHMENT_REFERENCE", "Referencia de adjunto inválida.");
  if (!(await repository(request).deleteCaseAttachment(caseId, attachmentId, projectId)))
    throw new HttpError(404, "CASE_ATTACHMENT_NOT_FOUND", "No se encontró el adjunto indicado.");
  response.status(204).end();
}

function validUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function detectImageType(bytes: Buffer): ImageType | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
    return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}
