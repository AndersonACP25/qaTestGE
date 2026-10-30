import { createHash } from "node:crypto";
import type { DatabaseClient } from "../auth/actor-database.js";
import type { Request, Response } from "express";
import { HttpError } from "../http-error.js";
export interface CreationContext {
  key: string;
  actorId: string;
}
export function creationContext(request: Request, response: Response): CreationContext | undefined {
  const key = request.get("Idempotency-Key");
  if (!key) return undefined;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))
    throw new HttpError(400, "INVALID_REQUEST_KEY", "El identificador de creación no es válido.");
  return { key: key.toLowerCase(), actorId: response.locals.user.id as string };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export function creationHash(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(input)))
    .digest("hex");
}
export async function previousCreation(
  client: DatabaseClient,
  type: "bug" | "case" | "run" | "plan",
  projectId: string,
  input: unknown,
  context?: CreationContext,
): Promise<string | null> {
  if (!context) return null;
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `${context.actorId}:${projectId}:${type}:${context.key}`,
  ]);
  const { rows } = await client.query<{ request_hash: string; resource_id: string }>(
    "SELECT request_hash,resource_id::text FROM qa.creation_requests WHERE user_id=$1 AND project_id=$2 AND resource_type=$3 AND request_key=$4",
    [context.actorId, projectId, type, context.key],
  );
  if (!rows[0]) return null;
  if (rows[0].request_hash !== creationHash(input))
    throw new HttpError(
      409,
      "REQUEST_KEY_CONFLICT",
      "La solicitud de creación ya se utilizó con otros datos. Revisa el registro antes de crear otro.",
    );
  return rows[0].resource_id;
}
export async function rememberCreation(
  client: DatabaseClient,
  type: "bug" | "case" | "run" | "plan",
  projectId: string,
  resourceId: string,
  input: unknown,
  context?: CreationContext,
) {
  if (context)
    await client.query(
      "INSERT INTO qa.creation_requests(user_id,project_id,resource_type,request_key,request_hash,resource_id) VALUES($1,$2,$3,$4,$5,$6)",
      [context.actorId, projectId, type, context.key, creationHash(input), resourceId],
    );
}
export function requireCreatedRow<T>(row: T | undefined): T {
  if (!row)
    throw new HttpError(
      409,
      "CREATED_RESOURCE_REMOVED",
      "El registro de esta solicitud ya se eliminó. No se volverá a crear automáticamente.",
    );
  return row;
}
