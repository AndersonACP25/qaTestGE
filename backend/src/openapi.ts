import { bugPriorities, bugStatuses } from "./models/bug.model.js";
import { testCaseStatuses } from "./models/test-case.model.js";
import { evidenceTypes } from "./models/evidence.model.js";

const text = (maxLength: number) => ({ type: "string", minLength: 1, maxLength, pattern: "\\S" });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const object = <T extends object>(properties: T, required: string[]) => ({ type: "object", properties, required });
const projectId = { type: "string", pattern: "^[1-9][0-9]{0,18}$", example: "1", description: "ID bigint decimal como texto, hasta 9223372036854775807. Requiere membresía en la organización del proyecto." };
const step = object({ action: text(10000), expectedResult: text(10000) }, ["action", "expectedResult"]);
const caseIds = { type: "array", maxItems: 1000, uniqueItems: true, items: { type: "string", pattern: "^TC-[0-9]{1,19}$" }, default: [] };
const inputs = {
  BugInput: object({ projectId, title: text(200), priority: { type: "string", enum: bugPriorities }, description: { type: "string", maxLength: 5000 }, assignee: { type: "string", nullable: true, maxLength: 100 } }, ["projectId", "title", "priority"]),
  TestCaseInput: object({ projectId, title: text(200), suite: { type: "string", maxLength: 100 }, preconditions: { type: "string", maxLength: 10000 }, steps: { type: "array", maxItems: 100, items: step } }, ["projectId", "title"]),
  TestRunInput: object({ projectId, title: text(200), owner: text(100), caseIds }, ["projectId", "title", "owner"]),
  EvidenceInput: object({ projectId, name: text(255), type: { type: "string", enum: evidenceTypes }, sizeBytes: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER }, related: { type: "string", nullable: true, pattern: "^(BUG|TC|RUN|RES)-[0-9]{1,19}$", description: "Referencia existente en el mismo proyecto, o null." } }, ["projectId", "name", "type", "sizeBytes"]),
};
const common = { id: { type: "string" }, createdAt: { type: "string", format: "date-time" } };
const resources = [["bugs", "Bug", "INVALID_BUG"], ["test-cases", "TestCase", "INVALID_TEST_CASE"], ["test-runs", "TestRun", "INVALID_TEST_RUN"], ["evidence", "Evidence", "INVALID_EVIDENCE"]] as const;
const errorResponse = (description: string) => ({ description, content: json(ref("Error")) });
const envelope = (data: object) => object({ data }, ["data"]);
const project = object({ id: projectId, organizationId: projectId, name: text(100), description: { type: "string" } }, ["id", "organizationId", "name", "description"]);
const unavailable = errorResponse("DATABASE_UNAVAILABLE: PostgreSQL no disponible.");

export const openApiDocument = {
  openapi: "3.0.3",
  info: { title: "qaTestGE API", version: "1.0.0", description: "API con usuarios locales y sesiones HttpOnly persistidas en PostgreSQL. Las plantillas de bugs son privadas por cuenta. Las escrituras requieren sesión y X-CSRF-Token. Evidencias: solo metadatos. projectId obligatorio; caseIds sustituye caseCount; related en la respuesta es un array." },
  servers: [{ url: "/", description: "Servidor actual (directo o proxy /api)" }],
  security: [{ sessionCookie: [] as string[] }],
  paths: {
    "/api/auth/register": { post: { security: [], summary: "Registrar usuario y crear workspace/proyecto propios", requestBody: { required: true, content: json(object({ name: text(100), email: { type: "string", format: "email", maxLength: 254 }, password: { type: "string", minLength: 12, maxLength: 128, format: "password" } }, ["name", "email", "password"])) }, responses: { "201": { description: "Cuenta y cookie creadas", content: json(envelope(ref("AuthState"))) }, "400": errorResponse("INVALID_REGISTRATION"), "409": errorResponse("ACCOUNT_EXISTS"), "429": errorResponse("TOO_MANY_ATTEMPTS o AUTH_BUSY") } } },
    "/api/auth/login": { post: { security: [], summary: "Iniciar sesión y rotar cookie del navegador", requestBody: { required: true, content: json(object({ email: { type: "string", format: "email" }, password: { type: "string", maxLength: 128, format: "password" } }, ["email", "password"])) }, responses: { "200": { description: "Sesión iniciada", content: json(envelope(ref("AuthState"))) }, "401": errorResponse("INVALID_CREDENTIALS"), "429": errorResponse("TOO_MANY_ATTEMPTS o AUTH_BUSY") } } },
    "/api/auth/me": {
      get: { summary: "Sesión actual y token CSRF", responses: { "200": { description: "Usuario actual", content: json(envelope(ref("AuthState"))) }, "401": errorResponse("UNAUTHENTICATED") } },
      patch: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Actualizar nombre y correo de la cuenta", requestBody: { required: true, content: json(ref("ProfileInput")) }, responses: { "200": { description: "Perfil actualizado", content: json(envelope(ref("User"))) }, "400": errorResponse("INVALID_PROFILE"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF"), "409": errorResponse("ACCOUNT_EXISTS") } },
      delete: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Desactivar y anonimizar la cuenta; conserva proyectos y registros QA", requestBody: { required: true, content: json(ref("AccountDeletionInput")) }, responses: { "204": { description: "Cuenta anonimizada, sesiones revocadas y cookie borrada" }, "400": errorResponse("INVALID_ACCOUNT_DELETION"), "401": errorResponse("INVALID_PASSWORD o UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF") } },
    },
    "/api/auth/bug-templates": {
      get: { summary: "Listar plantillas privadas del usuario", responses: { "200": { description: "Plantillas de la cuenta", content: json(envelope({ type: "array", items: ref("BugTemplate") })) }, "401": errorResponse("UNAUTHENTICATED") } },
      post: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Crear plantilla personal de bug", requestBody: { required: true, content: json(ref("BugTemplateInput")) }, responses: { "201": { description: "Plantilla creada", content: json(envelope(ref("BugTemplate"))) }, "400": errorResponse("INVALID_TEMPLATE"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF"), "409": errorResponse("CONFLICT: nombre duplicado en la cuenta.") } },
    },
    "/api/auth/bug-templates/{templateId}": {
      patch: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Actualizar una plantilla propia", parameters: [{ in: "path", name: "templateId", required: true, schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" } }], requestBody: { required: true, content: json(ref("BugTemplateInput")) }, responses: { "200": { description: "Plantilla actualizada", content: json(envelope(ref("BugTemplate"))) }, "400": errorResponse("INVALID_TEMPLATE"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF"), "404": errorResponse("TEMPLATE_NOT_FOUND"), "409": errorResponse("CONFLICT: nombre duplicado en la cuenta.") } },
      delete: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Eliminar una plantilla propia", parameters: [{ in: "path", name: "templateId", required: true, schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" } }], responses: { "204": { description: "Plantilla eliminada" }, "400": errorResponse("INVALID_TEMPLATE"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF"), "404": errorResponse("TEMPLATE_NOT_FOUND") } },
    },
    "/api/auth/password": { patch: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Cambiar contraseña y revocar las demás sesiones", requestBody: { required: true, content: json(ref("PasswordInput")) }, responses: { "204": { description: "Contraseña actualizada" }, "400": errorResponse("INVALID_PASSWORD"), "401": errorResponse("INVALID_PASSWORD o UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF") } } },
    "/api/auth/logout": { post: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Revocar sesión y eliminar cookie; enviar JSON vacío", requestBody: { required: true, content: json({ type: "object", example: {} }) }, responses: { "204": { description: "Sesión revocada" }, "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF") } } },
    "/api/health": { get: { security: [], summary: "Disponibilidad de API y conexión PostgreSQL", responses: { "200": { description: "API y base disponibles", content: json(envelope(object({ status: { type: "string", enum: ["ok"] }, database: { type: "string", enum: ["postgresql"] } }, ["status", "database"]))) }, "503": unavailable } } },
    "/api/projects": { get: { summary: "Listar proyectos existentes", responses: { "200": { description: "Proyectos", content: json(envelope({ type: "array", items: project })) }, "503": unavailable } } },
    "/api/bugs/{bugId}/status": {
      patch: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Actualizar el estado de un bug en un proyecto autorizado", parameters: [{ in: "path", name: "bugId", required: true, schema: { type: "string", pattern: "^BUG-[0-9]{1,19}$" } }], requestBody: { required: true, content: json(ref("BugStatusInput")) }, responses: { "200": { description: "Estado actualizado", content: json(envelope(ref("Bug"))) }, "400": errorResponse("INVALID_BUG_STATUS"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"), "404": errorResponse("PROJECT_NOT_FOUND o BUG_NOT_FOUND"), "503": unavailable } },
    },
    "/api/test-cases/{caseId}/status": {
      patch: { security: [{ sessionCookie: [], csrfToken: [] }], summary: "Actualizar el estado de un caso de prueba en un proyecto autorizado", parameters: [{ in: "path", name: "caseId", required: true, schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" } }], requestBody: { required: true, content: json(ref("TestCaseStatusInput")) }, responses: { "200": { description: "Estado actualizado", content: json(envelope(ref("TestCase"))) }, "400": errorResponse("INVALID_TEST_CASE_STATUS"), "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"), "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"), "503": unavailable } },
    },
    ...Object.fromEntries(resources.map(([path, schema, code]) => [`/api/${path}`, {
      get: { summary: `Listar ${path}`, tags: [path], parameters: [{ in: "query", name: "projectId", required: false, schema: projectId }], responses: { "200": { description: "Colección persistida", content: json(envelope({ type: "array", items: ref(schema) })) }, "400": errorResponse("INVALID_PROJECT_ID: filtro inválido."), "503": unavailable } },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }], summary: `Crear ${path}`, tags: [path], requestBody: { required: true, content: json(ref(`${schema}Input`)) }, responses: {
          "201": { description: "Recurso persistido", content: json(envelope(ref(schema))) },
          "400": errorResponse(`${code}: campos inválidos; INVALID_JSON; INVALID_REFERENCE: referencia inexistente o de otro proyecto.`),
          "401": errorResponse("UNAUTHENTICATED"), "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"), "404": errorResponse("PROJECT_NOT_FOUND"), "409": errorResponse("CONFLICT: vínculo duplicado."), "413": errorResponse("PAYLOAD_TOO_LARGE: cuerpo superior a 1 MB."),
          "500": errorResponse("INTERNAL_ERROR: error interno."), "503": unavailable,
        }
      },
    }])),
  },
  components: {
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "qa_session" }, csrfToken: { type: "apiKey", in: "header", name: "X-CSRF-Token", description: "Copiar csrfToken de /api/auth/me después de iniciar sesión." } }, schemas: {
      User: object({ id: { type: "string", pattern: "^[1-9][0-9]{0,18}$" }, name: text(100), email: { type: "string", format: "email", maxLength: 254 } }, ["id", "name", "email"]),
      AuthState: object({ user: ref("User"), csrfToken: { type: "string", minLength: 64, maxLength: 64 } }, ["user", "csrfToken"]),
      ProfileInput: object({ name: text(100), email: { type: "string", format: "email", maxLength: 254 } }, ["name", "email"]),
      PasswordInput: object({ currentPassword: { type: "string", minLength: 1, maxLength: 128, format: "password" }, newPassword: { type: "string", minLength: 12, maxLength: 128, format: "password" } }, ["currentPassword", "newPassword"]),
      AccountDeletionInput: object({ currentPassword: { type: "string", minLength: 1, maxLength: 128, format: "password" }, confirmation: { type: "string", enum: ["ELIMINAR CUENTA"] } }, ["currentPassword", "confirmation"]),
      BugTemplateInput: object({ name: text(100), title: { type: "string", maxLength: 200 }, description: { type: "string", maxLength: 5000 }, priority: { type: "string", enum: bugPriorities } }, ["name", "title", "description", "priority"]),
      BugTemplate: object({ id: { type: "string", pattern: "^[1-9][0-9]{0,18}$" }, name: text(100), title: { type: "string", maxLength: 200 }, description: { type: "string", maxLength: 5000 }, priority: { type: "string", enum: bugPriorities }, createdAt: { type: "string", format: "date-time" } }, ["id", "name", "title", "description", "priority", "createdAt"]),
      BugStatusInput: object({ projectId, status: { type: "string", enum: bugStatuses } }, ["projectId", "status"]),
      TestCaseStatusInput: object({ projectId, status: { type: "string", enum: testCaseStatuses } }, ["projectId", "status"]),
      ...inputs,
      Bug: object({ ...inputs.BugInput.properties, ...common, project: text(100), description: { type: "string" }, assignee: { type: "string", nullable: true }, status: { type: "string", enum: bugStatuses } }, ["id", "projectId", "title", "project", "priority", "description", "status", "assignee", "createdAt"]),
      TestCase: object({ ...inputs.TestCaseInput.properties, ...common, status: { type: "string", enum: testCaseStatuses } }, ["id", "projectId", "title", "suite", "preconditions", "steps", "status", "createdAt"]),
      TestRun: object({ ...inputs.TestRunInput.properties, ...common, caseCount: { type: "integer", minimum: 0 }, progress: { type: "number", minimum: 0, maximum: 100 }, status: { type: "string", enum: ["En curso", "Completado"] } }, ["id", "projectId", "title", "owner", "caseIds", "caseCount", "progress", "status", "createdAt"]),
      Evidence: object({ ...inputs.EvidenceInput.properties, ...common, related: { type: "array", items: { type: "string" } } }, ["id", "projectId", "name", "type", "sizeBytes", "related", "createdAt"]),
      Error: object({ error: object({ code: { type: "string" }, message: { type: "string" } }, ["code", "message"]) }, ["error"]),
    }
  },
};
