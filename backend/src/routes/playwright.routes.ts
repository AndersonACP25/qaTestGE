import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { AuthorizedRepository } from "../auth/authorized-repository.js";
import { HttpError } from "../http-error.js";
import { playwrightImportSchema } from "../models/playwright-import.model.js";
import type { AuthProvider } from "../models/user.model.js";
import type { Repository } from "../repositories/repository.js";
import { isId } from "../validation.js";

export function publishPlaywright(base: Repository, auth: AuthProvider): RequestHandler {
  const {
    PLAYWRIGHT_TOKEN_SHA256: hash,
    PLAYWRIGHT_PROJECT_ID: projectId,
    PLAYWRIGHT_ACTOR_ID: actorId,
  } = process.env;
  return async (request, response) => {
    if (!hash || !/^[a-f0-9]{64}$/.test(hash) || !isId(projectId) || !isId(actorId))
      throw new HttpError(
        404,
        "PLAYWRIGHT_DISABLED",
        "La publicación de Playwright no está habilitada.",
      );
    const token = /^Bearer ([a-f0-9]{64})$/.exec(request.get("authorization") ?? "")?.[1];
    if (
      !token ||
      !timingSafeEqual(Buffer.from(hash, "hex"), createHash("sha256").update(token).digest())
    )
      throw new HttpError(401, "INVALID_PLAYWRIGHT_TOKEN", "Credencial de publicación inválida.");
    const parsed = playwrightImportSchema.safeParse(request.body as unknown);
    if (!parsed.success)
      throw new HttpError(
        400,
        "INVALID_PLAYWRIGHT_REPORT",
        "Revisa los resultados y metadatos del reporte de Playwright.",
      );
    const scoped = base.forActor?.(actorId, response.locals.requestId ?? "") ?? base;
    const repository = new AuthorizedRepository(scoped, () => auth.projects(actorId), actorId);
    const run = await repository.importPlaywright(projectId, actorId, parsed.data);
    response.set("Cache-Control", "no-store").json({
      data: {
        id: run.id,
        unknownCaseIds: run.playwright?.unknownCaseIds ?? [],
        unmappedCount: parsed.data.unmappedCount,
      },
    });
  };
}
