import { Router } from "express";
import type { BugProposalProvider } from "../../../servicios/ia/gemini.mjs";
import { HttpError } from "../http-error.js";
import { bugPriorities } from "../models/bug.model.js";
import type { Response } from "express";
import { caseProposalInput, caseProposalList } from "../models/case-proposal.model.js";
import { can, type Permission } from "../models/collaboration.model.js";
import type { Repository } from "../repositories/repository.js";
import { accountGeminiProvider, type GeminiSettings } from "./gemini-settings.routes.js";
import {
  runSummaryContext,
  runSummaryOutput,
  summarizeRunContext,
} from "../models/run-summary.model.js";
import { isId, isRecord, parseReference, text } from "../validation.js";

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

export function aiRouter(provider?: BugProposalProvider, settings?: GeminiSettings): Router {
  const router = Router();
  const accounts = new Map<string, { attempts: number; resetAt: number }>();
  let pending = 0;

  async function authorizedProject(response: Response, projectId: string, permission: Permission) {
    const repository: Repository = response.locals.repository;
    const project = (await repository.listProjects()).find(({ id }) => id === projectId);
    if (!project) throw new HttpError(404, "PROJECT_NOT_FOUND", "El proyecto no está disponible.");
    if (!can(project.role, permission))
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Tu rol no permite generar propuestas para este proyecto.",
      );
    return repository;
  }

  async function generate<T>(
    response: Response,
    projectId: string,
    permission: Permission,
    propose: (provider: BugProposalProvider, repository: Repository) => Promise<T>,
  ): Promise<T> {
    const repository = await authorizedProject(response, projectId, permission);
    const accountId: string = response.locals.user.id;
    const accountKey = await settings?.credentials.key(accountId);
    const selectedProvider =
      accountKey && settings ? accountGeminiProvider(settings, accountKey) : provider;
    if (!selectedProvider)
      throw new HttpError(503, "AI_DISABLED", "La asistencia de IA está desactivada.");

    const now = Date.now();
    for (const [id, usage] of accounts) if (usage.resetAt <= now) accounts.delete(id);
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
      return await propose(selectedProvider, repository);
    } finally {
      pending--;
    }
  }

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

    const input = {
      description: body.description.trim(),
      ...(body.templateText === undefined ? {} : { templateText: body.templateText.trim() }),
    };
    const data = await generate(response, body.projectId, "bugs.write", async (provider) => {
      const result = await provider.propose(input);
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
      return {
        title: proposal.title.trim(),
        description: proposal.description.trim(),
        priority: proposal.priority,
      };
    });
    response.json({ data });
  });

  router.post("/ai/case-proposals", async (request, response) => {
    const body: unknown = request.body;
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 4 ||
      !isId(body.projectId) ||
      body.consent !== true
    )
      throw new HttpError(400, "INVALID_AI_INPUT", "Revisa el texto y confirma su envío a Gemini.");
    const input = caseProposalInput.safeParse({
      description: body.description,
      categories: body.categories,
    });
    if (!input.success)
      throw new HttpError(
        400,
        "INVALID_AI_INPUT",
        "Revisa la descripción, las categorías y sus cantidades.",
      );
    const data = await generate(response, body.projectId, "cases.write", async (provider) => {
      if (!provider.proposeCases)
        throw new HttpError(503, "AI_DISABLED", "La generación de casos no está disponible.");
      const result = await provider.proposeCases(input.data);
      if (!result.ok) throw providerErrors[result.reason];
      const cases = caseProposalList.safeParse(result.proposal);
      if (
        !cases.success ||
        cases.data.some(({ categoryIndex }) => categoryIndex >= input.data.categories.length) ||
        input.data.categories.some(
          ({ count }, index) =>
            cases.data.filter(({ categoryIndex }) => categoryIndex === index).length !== count,
        )
      )
        throw providerErrors.invalid;
      return cases.data;
    });
    response.json({ data });
  });

  async function loadRunContext(repository: Repository, projectId: string, runId: string) {
    const run = await repository.findRun(runId, projectId);
    if (!run) throw new HttpError(404, "TEST_RUN_NOT_FOUND", "No se encontró la ejecución.");
    return summarizeRunContext(run);
  }

  router.get("/ai/run-summary", async (request, response) => {
    const { projectId } = request.query;
    const runId = parseReference(request.query.runId, "RUN");
    if (!isId(projectId) || !runId)
      throw new HttpError(400, "INVALID_AI_INPUT", "Selecciona una ejecución válida.");
    const repository = await authorizedProject(response, projectId, "runs.write");
    response.json({ data: await loadRunContext(repository, projectId, runId) });
  });

  router.post("/ai/run-summary", async (request, response) => {
    const body: unknown = request.body;
    const runId = isRecord(body) ? parseReference(body.runId, "RUN") : null;
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 4 ||
      !isId(body.projectId) ||
      !runId ||
      body.consent !== true
    )
      throw new HttpError(400, "INVALID_AI_INPUT", "Confirma el envío del resumen a Gemini.");
    const context = runSummaryContext.safeParse(body.context);
    if (!context.success)
      throw new HttpError(400, "INVALID_AI_INPUT", "Revisa los datos de la ejecución.");
    const projectId = body.projectId;
    const data = await generate(response, projectId, "runs.write", async (provider, repository) => {
      const current = await loadRunContext(repository, projectId, runId);
      if (JSON.stringify(current) !== JSON.stringify(context.data))
        throw new HttpError(
          409,
          "AI_RUN_CHANGED",
          "Los resultados cambiaron. Vuelve a abrir el resumen para revisar los datos actuales.",
        );
      if (!provider.summarizeRun)
        throw new HttpError(503, "AI_DISABLED", "El resumen de ejecución no está disponible.");
      const result = await provider.summarizeRun(current);
      if (!result.ok) throw providerErrors[result.reason];
      const summary = runSummaryOutput.safeParse(result.proposal);
      if (!summary.success) throw providerErrors.invalid;
      return summary.data;
    });
    response.json({ data });
  });

  return router;
}
