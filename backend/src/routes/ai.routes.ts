import { Router } from "express";
import type { BugProposalProvider } from "../../../servicios/ia/gemini.mjs";
import { HttpError } from "../http-error.js";
import { bugPriorities } from "../models/bug.model.js";
import { can } from "../models/collaboration.model.js";
import type { Repository } from "../repositories/repository.js";
import { isId, isRecord, text } from "../validation.js";

const providerErrors = {
  quota: new HttpError(429, "AI_PROVIDER_QUOTA", "Gemini alcanzó su límite de solicitudes."),
  timeout: new HttpError(504, "AI_TIMEOUT", "Gemini tardó demasiado en responder."),
  unavailable: new HttpError(503, "AI_PROVIDER_UNAVAILABLE", "Gemini no está disponible."),
  invalid: new HttpError(
    502,
    "AI_INVALID_PROPOSAL",
    "Gemini no devolvió una propuesta utilizable.",
  ),
};

export function aiRouter(provider?: BugProposalProvider): Router {
  const router = Router();
  const accounts = new Map<string, { attempts: number; resetAt: number }>();
  let pending = 0;

  router.post("/ai/bug-proposals", async (request, response) => {
    const body: unknown = request.body;
    if (
      !isRecord(body) ||
      !Object.keys(body).every((key) =>
        ["projectId", "consent", "description", "templateText"].includes(key),
      ) ||
      !isId(body.projectId) ||
      body.consent !== true ||
      !text(body.description, 3500) ||
      (body.templateText !== undefined && !text(body.templateText, 1500))
    )
      throw new HttpError(400, "INVALID_AI_INPUT", "Revisa el texto y confirma su envío a Gemini.");

    const repository: Repository = response.locals.repository;
    const project = (await repository.listProjects()).find(({ id }) => id === body.projectId);
    if (!project) throw new HttpError(404, "PROJECT_NOT_FOUND", "El proyecto no está disponible.");
    if (!can(project.role, "bugs.write"))
      throw new HttpError(403, "FORBIDDEN", "Tu rol no permite preparar bugs en este proyecto.");
    if (!provider) throw new HttpError(503, "AI_DISABLED", "La asistencia de IA está desactivada.");

    const now = Date.now();
    for (const [id, usage] of accounts) if (usage.resetAt <= now) accounts.delete(id);
    const accountId: string = response.locals.user.id;
    const usage = accounts.get(accountId);
    if (pending >= 2 || (usage?.attempts ?? 0) >= 3 || (!usage && accounts.size >= 1000)) {
      response.setHeader(
        "Retry-After",
        usage && usage.attempts >= 3 ? String(Math.ceil((usage.resetAt - now) / 1000)) : "60",
      );
      throw new HttpError(
        429,
        "AI_RATE_LIMIT",
        "Hay demasiadas solicitudes de IA. Intenta más tarde.",
      );
    }
    accounts.set(accountId, {
      attempts: (usage?.attempts ?? 0) + 1,
      resetAt: usage?.resetAt ?? now + 60_000,
    });
    pending++;
    try {
      const result = await provider.propose({
        description: body.description.trim(),
        ...(body.templateText === undefined ? {} : { templateText: body.templateText.trim() }),
      });
      if (!result.ok) throw providerErrors[result.reason];
      const proposal = result.proposal;
      if (
        !isRecord(proposal) ||
        Object.keys(proposal).length !== 3 ||
        !text(proposal.title, 200) ||
        !text(proposal.description, 5000) ||
        !bugPriorities.some((priority) => priority === proposal.priority)
      )
        throw providerErrors.invalid;
      response.json({
        data: {
          title: proposal.title.trim(),
          description: proposal.description.trim(),
          priority: proposal.priority,
        },
      });
    } finally {
      pending--;
    }
  });

  return router;
}
