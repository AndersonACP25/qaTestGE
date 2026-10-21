import type { Request } from "express";
import { HttpError } from "./http-error.js";

const maxId = 9223372036854775807n;
export function isId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= maxId;
}
export function parseReference(value: unknown, prefix: string): string | null {
  if (typeof value !== "string" || !value.startsWith(`${prefix}-`)) return null;
  const digits = value.slice(prefix.length + 1);
  if (!/^\d{1,19}$/.test(digits)) return null;
  const id = BigInt(digits).toString();
  return isId(id) ? id : null;
}
export function resourceId(prefix: string, id: string): string {
  return `${prefix}-${id.padStart(3, "0")}`;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
export function projectFilter(request: Request): string | undefined {
  const id = request.query.projectId;
  if (id === undefined) return undefined;
  if (!isId(id))
    throw new HttpError(
      400,
      "INVALID_PROJECT_ID",
      "projectId debe ser un identificador decimal positivo enviado como texto.",
    );
  return id;
}
