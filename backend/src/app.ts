import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import bugsRouter from "./routes/bugs.routes.js";
import evidenceRouter from "./routes/evidence.routes.js";
import testCasesRouter from "./routes/test-cases.routes.js";
import testRunsRouter from "./routes/test-runs.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ data: { status: "ok" } });
});
app.use("/api/bugs", bugsRouter);
app.use("/api/test-cases", testCasesRouter);
app.use("/api/test-runs", testRunsRouter);
app.use("/api/evidence", evidenceRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "Endpoint no encontrado." },
  });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (isBodyParserError(error, "entity.parse.failed")) {
    response.status(400).json({
      error: { code: "INVALID_JSON", message: "El cuerpo de la solicitud no contiene JSON válido." },
    });
    return;
  }

  if (isBodyParserError(error, "entity.too.large")) {
    response.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud supera el límite permitido." },
    });
    return;
  }

  console.error("Error no controlado en la API:", error);
  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno." },
  });
};

app.use(errorHandler);

function isBodyParserError(error: unknown, type: string): boolean {
  return typeof error === "object"
    && error !== null
    && "type" in error
    && error.type === type;
}

export default app;
