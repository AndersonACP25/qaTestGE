import { z } from "zod";
import { requirementInput, tagImportInput } from "./routes/analytics.routes.js";
const text = { type: "string" },
  count = { type: "integer", minimum: 0 },
  rate = { type: "integer", minimum: 0, maximum: 100, nullable: true };
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  required: Object.keys(properties),
  properties,
});
const array = (items: object, maxItems?: number) => ({
  type: "array",
  items,
  ...(maxItems ? { maxItems } : {}),
});
const project = {
  name: "projectId",
  in: "query",
  required: true,
  schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
};
const parameter = (name: string, schema: object, required = false, location = "query") => ({
  name,
  in: location,
  required,
  schema,
});
const pagination = [
  parameter("limit", { type: "integer", minimum: 1, maximum: 100, default: 50 }),
  parameter("offset", { type: "integer", minimum: 0, maximum: 10000000, default: 0 }),
];
const key = parameter("Idempotency-Key", { type: "string", format: "uuid" }, true, "header");
const requirement = object({
  id: text,
  projectId: text,
  code: text,
  title: text,
  description: text,
  caseIds: array(text, 100),
  version: { type: "integer", minimum: 1 },
  createdAt: { type: "string", format: "date-time" },
});
const coverage = object({
  rows: array(
    object({
      requirementId: text,
      code: text,
      title: text,
      caseId: { ...text, nullable: true },
      caseTitle: { ...text, nullable: true },
      bugId: { ...text, nullable: true },
      bugTitle: { ...text, nullable: true },
    }),
    100,
  ),
  total: count,
  limit: count,
  offset: count,
});
const summary = object(
  Object.fromEntries(
    [
      "bugs",
      "openBugs",
      "closedBugs",
      "cases",
      "activeCases",
      "runs",
      "activeRuns",
      "completedRuns",
      "evidence",
      "recorded",
      "passed",
      "failed",
      "blocked",
      "skipped",
      "requirements",
      "coveredRequirements",
    ]
      .map((k) => [k, count])
      .concat([["approvalRate", rate]]),
  ),
);
const analytics = object({
  range: object({ from: text, to: text }),
  historySince: text,
  generatedAt: text,
  summary,
  runTrend: array(
    object({
      id: text,
      title: text,
      createdAt: text,
      recorded: count,
      evaluated: count,
      passed: count,
      failed: count,
      approvalRate: rate,
    }),
    60,
  ),
  bugTrend: array(
    object({
      date: text,
      open: { ...count, nullable: true },
      closed: { ...count, nullable: true },
    }),
    366,
  ),
  frequentFailures: array(
    object({ caseId: text, title: text, failures: count, executions: count }),
    10,
  ),
  typeCoverage: array(object({ type: text, total: count, executed: count })),
});
const report = object({
  projectName: text,
  generatedAt: text,
  runId: text,
  title: text,
  owner: text,
  status: text,
  createdAt: text,
  summary: object({
    total: count,
    recorded: count,
    passed: count,
    failed: count,
    blocked: count,
    skipped: count,
    approvalRate: rate,
  }),
  results: array(
    object({
      id: text,
      caseId: text,
      title: text,
      caseVersion: { type: "integer", minimum: 1 },
      status: { type: "string", enum: ["passed", "failed", "blocked", "skipped"] },
      notes: text,
      executedAt: { ...text, nullable: true },
      steps: array(object({ action: text, expectedResult: text })),
      bugIds: array(text),
      evidence: array(object({ id: text, name: text })),
    }),
    1000,
  ),
});
function operation(
  description: string,
  schema: object | null,
  parameters: object[],
  input?: object,
  created = false,
) {
  return {
    summary: description,
    security: [{ sessionCookie: [], csrfToken: [] }],
    parameters,
    ...(input
      ? { requestBody: { required: true, content: { "application/json": { schema: input } } } }
      : {}),
    responses: {
      [schema ? (created ? "201" : "200") : "204"]: {
        description: "Operación completada",
        ...(schema
          ? { content: { "application/json": { schema: object({ data: schema }) } } }
          : {}),
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 413, 503].map((code) => [
          code,
          {
            description:
              "Solicitud inválida, permiso insuficiente, conflicto o capacidad no disponible",
          },
        ]),
      ),
    },
  };
}
const reqPath = parameter("id", { type: "string", pattern: "^REQ-[0-9]{1,19}$" }, true, "path");
export const analyticsPaths = {
  "/api/analytics": {
    get: operation(
      "Agregados por proyecto y rango UTC inclusivo (máximo 366 días). Tasa excluye omitidos y pendientes. Estado de bugs histórico desde migración 015; días previos son null. Hasta 60 ejecuciones por fecha de creación.",
      analytics,
      [
        project,
        parameter("from", { type: "string", format: "date" }),
        parameter("to", { type: "string", format: "date" }),
      ],
    ),
  },
  "/api/requirements": {
    get: operation(
      "Requisitos paginados",
      object({ items: array(requirement, 100), total: count }),
      [project, ...pagination, parameter("search", { type: "string", maxLength: 200 })],
    ),
    post: operation(
      "Crear requisito con permiso cases.write e idempotencia",
      requirement,
      [key],
      z.toJSONSchema(requirementInput),
      true,
    ),
  },
  "/api/requirements/{id}": {
    patch: operation(
      "Editar requisito con control de versión",
      requirement,
      [reqPath],
      z.toJSONSchema(requirementInput.extend({ version: z.number().int().positive() })),
    ),
    delete: operation(
      "Eliminar requisito y sus vínculos",
      null,
      [project, reqPath, parameter("version", { type: "integer", minimum: 1 }, true)],
      object({}),
    ),
  },
  "/api/coverage-matrix": {
    get: operation(
      "Matriz requisito, caso y bug paginada; conserva requisitos sin casos",
      coverage,
      [
        project,
        ...pagination,
        parameter("requirementId", { type: "string", pattern: "^REQ-[0-9]{1,19}$" }),
        parameter("caseId", { type: "string", pattern: "^TC-[0-9]{1,19}$" }),
        parameter("bugId", { type: "string", pattern: "^BUG-[0-9]{1,19}$" }),
      ],
    ),
  },
  "/api/coverage-links": {
    post: operation(
      "Vincular un bug al caso de un requisito. Requiere cases.write y bugs.write.",
      null,
      [project],
      object({ requirementId: text, caseId: text, bugId: text }),
    ),
  },
  "/api/test-runs/{runId}/report": {
    get: operation(
      "Informe autenticado de solo lectura con snapshot de pasos y referencias de evidencia. Fuente para PDF local.",
      report,
      [project, parameter("runId", { type: "string", pattern: "^RUN-[0-9]{1,19}$" }, true, "path")],
    ),
  },
  "/api/imports/tags": {
    post: operation(
      "Lote atómico e idempotente; conserva mismo nombre y color, rechaza color distinto. Requiere tags.write.",
      object({ created: count, existing: count }),
      [project, key],
      z.toJSONSchema(tagImportInput),
    ),
  },
};
