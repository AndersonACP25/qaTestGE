import { bugPriorities, bugStatuses } from "./models/bug.model.js";
import { evidenceTypes } from "./models/evidence.model.js";

const text = (maxLength: number) => ({ type: "string", minLength: 1, maxLength, pattern: "\\S" });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const object = (properties: object, required: string[]) => ({ type: "object", properties, required });
const inputs = {
  BugInput: object({ title: text(200), project: text(100), priority: { type: "string", enum: bugPriorities }, description: { type: "string", maxLength: 5000 }, assignee: { type: "string", nullable: true, maxLength: 100 } }, ["title", "project", "priority"]),
  TestCaseInput: object({ title: text(200), suite: text(100) }, ["title", "suite"]),
  TestRunInput: object({ title: text(200), owner: text(100), caseCount: { type: "integer", minimum: 0, default: 0 } }, ["title", "owner"]),
  EvidenceInput: object({ name: text(255), type: { type: "string", enum: evidenceTypes }, sizeBytes: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER }, related: { type: "string", nullable: true, maxLength: 100, description: "Referencia opcional; actualmente no se comprueba su existencia." } }, ["name", "type", "sizeBytes"]),
};
const common = { id: { type: "string" }, createdAt: { type: "string", format: "date-time" } };
const resources = [
  ["bugs", "Bug", "INVALID_BUG"], ["test-cases", "TestCase", "INVALID_TEST_CASE"],
  ["test-runs", "TestRun", "INVALID_TEST_RUN"], ["evidence", "Evidence", "INVALID_EVIDENCE"],
] as const;
const errorResponse = (description: string) => ({ description, content: json(ref("Error")) });
const envelope = (data: object) => object({ data }, ["data"]);

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "qaTestGE API", version: "1.0.0", description: "API de demostración sin autenticación. Datos temporales en memoria. Evidencias: solo metadatos. Probar POST crea registros en memoria." },
  servers: [{ url: "/", description: "Servidor actual (directo o proxy /api)" }],
  paths: {
    "/api/health": { get: { summary: "Estado de la API", responses: { "200": { description: "API disponible", content: json(envelope(object({ status: { type: "string", enum: ["ok"] } }, ["status"]))) } } } },
    ...Object.fromEntries(resources.map(([path, schema, code]) => [`/api/${path}`, {
      get: { summary: `Listar ${path}`, tags: [path], responses: { "200": { description: "Colección actual", content: json(envelope({ type: "array", items: ref(schema) })) } } },
      post: { summary: `Crear ${path}`, tags: [path], requestBody: { required: true, content: json(ref(`${schema}Input`)) }, responses: {
        "201": { description: "Recurso creado", content: json(envelope(ref(schema))) },
        "400": errorResponse(`${code}: campos inválidos; INVALID_JSON: JSON inválido.`),
        "413": errorResponse("PAYLOAD_TOO_LARGE: cuerpo superior a 1 MB."),
        "500": errorResponse("INTERNAL_ERROR: error interno."),
      } },
    }])),
  },
  components: { schemas: {
    ...inputs,
    Bug: object({ ...inputs.BugInput.properties, ...common, description: { type: "string" }, assignee: { type: "string", nullable: true }, status: { type: "string", enum: bugStatuses, default: "Abierto" } }, ["id", "title", "description", "project", "priority", "status", "assignee", "createdAt"]),
    TestCase: object({ ...inputs.TestCaseInput.properties, ...common, status: { type: "string", enum: ["Pendiente"] } }, ["id", "title", "suite", "status", "createdAt"]),
    TestRun: object({ ...inputs.TestRunInput.properties, ...common, progress: { type: "number", enum: [0] }, status: { type: "string", enum: ["En curso"] } }, ["id", "title", "owner", "caseCount", "progress", "status", "createdAt"]),
    Evidence: object({ ...inputs.EvidenceInput.properties, ...common }, ["id", "name", "type", "sizeBytes", "related", "createdAt"]),
    Error: object({ error: object({ code: { type: "string" }, message: { type: "string" } }, ["code", "message"]) }, ["error"]),
  } },
};
