import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";
import bugsRouter from "./routes/bugs.routes.js";
import evidenceRouter from "./routes/evidence.routes.js";
import testCasesRouter from "./routes/test-cases.routes.js";
import testRunsRouter from "./routes/test-runs.routes.js";
import tagsRouter from "./routes/tags.routes.js";
import type { Repository } from "./repositories/repository.js";
import { HttpError } from "./http-error.js";
import type { AuthProvider } from "./models/user.model.js";
import { authRouter, requireAuth, sameOrigin } from "./auth/routes.js";
import { isId, isRecord, text } from "./validation.js";

export function createApp(repository: Repository, auth: AuthProvider) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", sameOrigin());
  app.use("/api/auth", authRouter(auth));
  app.get("/api/openapi.json", (_request, response) => {
    response.json(openApiDocument);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "qaTestGE · SwaggerUI",
      swaggerOptions: { validatorUrl: null, withCredentials: true },
    }),
  );

  app.get("/api/health", async (_request, response) => {
    try {
      await repository.health();
      response.json({ data: { status: "ok", database: "postgresql" } });
    } catch {
      response.status(503).json({
        error: { code: "DATABASE_UNAVAILABLE", message: "PostgreSQL no está disponible." },
      });
    }
  });
  app.use("/api", requireAuth(auth, repository));
  app.get("/api/projects", async (_request, response) => {
    response.json({ data: await response.locals.repository.listProjects() });
  });
  function projectInput(body: unknown) {
    if (
      !isRecord(body) ||
      !text(body.name, 100) ||
      typeof body.description !== "string" ||
      body.description.length > 5000
    )
      throw new HttpError(400, "INVALID_PROJECT", "Introduce un nombre y una descripción válidos.");
    return { name: body.name, description: body.description };
  }
  app.post("/api/projects", async (request, response) => {
    const input = projectInput(request.body);
    response.status(201).json({
      data: await auth.createProject(response.locals.user.id, input.name, input.description),
    });
  });
  app.patch("/api/projects/:projectId", async (request, response) => {
    if (!isId(request.params.projectId))
      throw new HttpError(400, "INVALID_PROJECT", "Identificador de proyecto inválido.");
    const input = projectInput(request.body);
    response.json({
      data: await auth.updateProject(
        response.locals.user.id,
        request.params.projectId,
        input.name,
        input.description,
      ),
    });
  });
  app.delete("/api/projects/:projectId", async (request, response) => {
    if (!isId(request.params.projectId))
      throw new HttpError(400, "INVALID_PROJECT", "Identificador de proyecto inválido.");
    await auth.deleteProject(response.locals.user.id, request.params.projectId);
    response.status(204).end();
  });
  app.use("/api/bugs", bugsRouter);
  app.use("/api/test-cases", testCasesRouter);
  app.use("/api/test-runs", testRunsRouter);
  app.use("/api/tags", tagsRouter);
  app.use("/api/evidence", evidenceRouter);

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "Endpoint no encontrado." },
    });
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    const code =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (["3F000", "42P01", "42703"].includes(code)) {
      response.status(503).json({
        error: {
          code: "DATABASE_SCHEMA_UNAVAILABLE",
          message:
            "Falta una tabla o columna requerida en PostgreSQL. Verifica el esquema existente y ejecuta pnpm db:migrate; no reimportes 001_schema.sql sobre una base inicializada.",
        },
      });
      return;
    }
    if (code === "23503") {
      response.status(400).json({
        error: {
          code: "INVALID_REFERENCE",
          message:
            "El proyecto o referencia no existe, o los recursos pertenecen a proyectos distintos.",
        },
      });
      return;
    }
    if (code === "23505") {
      response
        .status(409)
        .json({ error: { code: "CONFLICT", message: "El registro o vínculo ya existe." } });
      return;
    }
    if (
      code.startsWith("08") ||
      [
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
        "ECONNRESET",
        "57P01",
        "57P03",
        "53300",
        "57014",
      ].includes(code) ||
      (error instanceof Error &&
        /connection.*(timeout|terminated)|timeout.*connection/i.test(error.message))
    ) {
      response.status(503).json({
        error: { code: "DATABASE_UNAVAILABLE", message: "PostgreSQL no está disponible." },
      });
      return;
    }
    if (isBodyParserError(error, "entity.parse.failed")) {
      response.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "El cuerpo de la solicitud no contiene JSON válido.",
        },
      });
      return;
    }

    if (isBodyParserError(error, "entity.too.large")) {
      response.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "El cuerpo de la solicitud supera el límite permitido.",
        },
      });
      return;
    }

    if (/^\w{5}$/.test(code)) console.error(`Error interno en la API (PostgreSQL ${code}).`);
    else console.error("Error interno en la API.");
    response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno." },
    });
  };

  app.use(errorHandler);

  function isBodyParserError(error: unknown, type: string): boolean {
    return typeof error === "object" && error !== null && "type" in error && error.type === type;
  }

  return app;
}
