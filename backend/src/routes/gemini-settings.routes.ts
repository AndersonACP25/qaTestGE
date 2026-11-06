import { Router } from "express";
import { geminiBugProposalProvider, verifyGeminiKey } from "../../../servicios/ia/gemini.mjs";
import { authRateLimit } from "../auth/middleware.js";
import { HttpError } from "../http-error.js";
import { bugPriorities } from "../models/bug.model.js";
import type { GeminiCredentials } from "../repositories/gemini-credentials.repository.js";
import { isRecord, text } from "../validation.js";

export interface GeminiSettings {
  credentials: GeminiCredentials;
  model: string;
  fetchRequest?: typeof fetch;
}

const isRevision = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

const verificationErrors = {
  rejected: new HttpError(
    422,
    "AI_KEY_REJECTED",
    "Google rechazó la clave o el modelo no está disponible para ella.",
  ),
  quota: new HttpError(429, "AI_PROVIDER_QUOTA", "Gemini alcanzó su límite de solicitudes."),
  unavailable: new HttpError(503, "AI_PROVIDER_UNAVAILABLE", "Gemini no está disponible."),
  timeout: new HttpError(504, "AI_TIMEOUT", "Gemini tardó demasiado en responder."),
};

export function accountGeminiProvider(settings: GeminiSettings, key: string) {
  return geminiBugProposalProvider(
    { AI_BUG_PROPOSALS_ENABLED: "true", GEMINI_API_KEY: key, GEMINI_MODEL: settings.model },
    bugPriorities,
    settings.fetchRequest,
  );
}

export function geminiSettingsRouter(hasServerProvider: boolean, settings?: GeminiSettings) {
  const router = Router();
  const requireSettings = () => {
    if (!settings)
      throw new HttpError(
        503,
        "AI_SETTINGS_DISABLED",
        "El servidor debe habilitar la conexión desde Configuración.",
      );
    return settings;
  };
  const status = (revision: string | null) => ({
    visualAvailable: Boolean(settings),
    revision,
    source: revision ? "account" : hasServerProvider ? "environment" : "none",
  });

  router.get("/ai/settings", async (_request, response) => {
    const userId: string = response.locals.user.id;
    response.json({ data: status((await settings?.credentials.revision(userId)) ?? null) });
  });

  router.put("/ai/settings", authRateLimit(), async (request, response) => {
    const { credentials, model, fetchRequest } = requireSettings();
    const body: unknown = request.body;
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 2 ||
      !text(body.apiKey, 256) ||
      !/^[A-Za-z0-9_.-]{20,256}$/.test(body.apiKey.trim()) ||
      (body.revision !== null && !isRevision(body.revision))
    )
      throw new HttpError(
        400,
        "INVALID_AI_SETTINGS",
        "Ingresa una clave válida de Google AI Studio.",
      );
    const userId: string = response.locals.user.id;
    const apiKey = body.apiKey.trim();
    const verification = await verifyGeminiKey(apiKey, model, fetchRequest);
    if (verification !== "valid") throw verificationErrors[verification];
    response.json({ data: status(await credentials.save(userId, apiKey, body.revision)) });
  });

  router.delete("/ai/settings", async (request, response) => {
    const { credentials } = requireSettings();
    const body: unknown = request.body;
    if (!isRecord(body) || Object.keys(body).length !== 1 || !isRevision(body.revision))
      throw new HttpError(400, "INVALID_AI_SETTINGS", "Recarga el estado de la conexión.");
    const userId: string = response.locals.user.id;
    await credentials.remove(userId, body.revision);
    response.json({ data: status(null) });
  });

  return router;
}
