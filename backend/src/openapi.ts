import { analyticsPaths } from "./analytics-openapi.js";
import { collaborationPaths } from "./collaboration-openapi.js";
import { qualityPaths } from "./quality-openapi.js";
import { bugPriorities } from "./models/bug.model.js";
import { testCaseStatuses } from "./models/test-case.model.js";
import { evidenceTypes } from "./models/evidence.model.js";

const text = (maxLength: number) => ({ type: "string", minLength: 1, maxLength, pattern: "\\S" });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const object = <T extends object>(properties: T, required: string[]) => ({
  type: "object",
  properties,
  required,
});
const projectId = {
  type: "string",
  pattern: "^[1-9][0-9]{0,18}$",
  example: "1",
  description:
    "ID bigint decimal como texto, hasta 9223372036854775807. Requiere membresía en la organización del proyecto.",
};
const step = object({ action: text(10000), expectedResult: text(10000) }, [
  "action",
  "expectedResult",
]);
const caseIds = {
  type: "array",
  maxItems: 1000,
  uniqueItems: true,
  items: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
  default: [],
};
const tagIds = {
  type: "array",
  maxItems: 100,
  uniqueItems: true,
  items: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
  default: [],
};
const inputs = {
  BugInput: object(
    {
      projectId,
      title: text(200),
      priority: { type: "string", enum: bugPriorities },
      severity: { type: "string", enum: bugPriorities },
      environment: { type: "string", maxLength: 100 },
      affectedVersion: { type: "string", maxLength: 100 },
      sourceResultId: {
        type: "string",
        pattern: "^RES-[0-9]{1,19}$",
        description:
          "Solo un fallo registrado del proyecto. Enlaza caso, ejecución, pasos y evidencias de forma transaccional; un bug por resultado.",
      },
      description: { type: "string", maxLength: 5000 },
      assignee: { type: "string", nullable: true, maxLength: 100 },
      assigneeUserId: { type: "string", nullable: true, pattern: "^[1-9][0-9]{0,18}$" },
      tagIds,
    },
    ["projectId", "title", "priority"],
  ),
  TestCaseInput: object(
    {
      projectId,
      title: text(200),
      suite: { type: "string", maxLength: 100 },
      testType: { type: "string", minLength: 1, maxLength: 100 },
      lifecycle: { type: "string", enum: ["Borrador", "Listo", "Obsoleto"] },
      expectedVersion: { type: "integer", minimum: 1 },
      preconditions: { type: "string", maxLength: 10000 },
      assigneeUserId: { type: "string", nullable: true, pattern: "^[1-9][0-9]{0,18}$" },
      steps: { type: "array", maxItems: 100, items: step },
      tagIds,
    },
    ["projectId", "title"],
  ),
  TestRunInput: object(
    {
      projectId,
      title: text(200),
      owner: text(100),
      caseIds,
      tagIds,
      planId: { type: "string", pattern: "^PLAN-[0-9]{1,19}$" },
      sourceRunId: { type: "string", pattern: "^RUN-[0-9]{1,19}$" },
      failedOnly: {
        type: "boolean",
        description:
          "Con sourceRunId: copia solo fallidos registrados. Los resultados nuevos quedan pendientes y conservan snapshots del origen.",
      },
    },
    ["projectId", "title", "owner"],
  ),
  EvidenceInput: object(
    {
      projectId,
      name: text(255),
      type: { type: "string", enum: evidenceTypes },
      sizeBytes: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
      related: {
        type: "string",
        nullable: true,
        pattern: "^(BUG|TC|RUN|RES)-[0-9]{1,19}$",
        description: "Referencia existente en el mismo proyecto, o null.",
      },
    },
    ["projectId", "name", "type", "sizeBytes"],
  ),
};
const common = { id: { type: "string" }, createdAt: { type: "string", format: "date-time" } };
const resources = [
  ["bugs", "Bug", "INVALID_BUG"],
  ["test-cases", "TestCase", "INVALID_TEST_CASE"],
  ["test-runs", "TestRun", "INVALID_TEST_RUN"],
  ["evidence", "Evidence", "INVALID_EVIDENCE"],
  ["tags", "Tag", "INVALID_TAG"],
] as const;
const errorResponse = (description: string) => ({ description, content: json(ref("Error")) });
const envelope = (data: object) => object({ data }, ["data"]);
const project = object(
  {
    id: projectId,
    organizationId: projectId,
    name: text(100),
    description: { type: "string" },
    role: { type: "string", enum: ["Admin", "QA", "Dev", "Solo lectura"] },
  },
  ["id", "organizationId", "name", "description"],
);
const unavailable = errorResponse("DATABASE_UNAVAILABLE: PostgreSQL no disponible.");

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "qaTestGE API",
    version: "1.1.0",
    description:
      "API con usuarios locales y sesiones HttpOnly persistidas en PostgreSQL. Las plantillas de bugs son privadas por cuenta. Las escrituras requieren sesión y X-CSRF-Token. Los archivos de evidencia se almacenan en PostgreSQL y se descargan de forma privada. projectId obligatorio; caseIds sustituye caseCount; related en la respuesta es un array.",
  },
  servers: [{ url: "/", description: "Servidor actual (directo o proxy /api)" }],
  security: [{ sessionCookie: [] as string[] }],
  paths: {
    ...analyticsPaths,
    ...qualityPaths,
    ...collaborationPaths,
    "/api/auth/register": {
      post: {
        security: [],
        summary: "Registrar usuario y crear workspace/proyecto propios",
        requestBody: {
          required: true,
          content: json(
            object(
              {
                name: text(100),
                email: { type: "string", format: "email", maxLength: 254 },
                password: { type: "string", minLength: 12, maxLength: 128, format: "password" },
              },
              ["name", "email", "password"],
            ),
          ),
        },
        responses: {
          "201": {
            description: "Cuenta y cookie creadas",
            content: json(envelope(ref("AuthState"))),
          },
          "400": errorResponse("INVALID_REGISTRATION"),
          "409": errorResponse("ACCOUNT_EXISTS"),
          "429": errorResponse("TOO_MANY_ATTEMPTS o AUTH_BUSY"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        security: [],
        summary: "Iniciar sesión y rotar cookie del navegador",
        requestBody: {
          required: true,
          content: json(
            object(
              {
                email: { type: "string", format: "email" },
                password: { type: "string", maxLength: 128, format: "password" },
              },
              ["email", "password"],
            ),
          ),
        },
        responses: {
          "200": { description: "Sesión iniciada", content: json(envelope(ref("AuthState"))) },
          "401": errorResponse("INVALID_CREDENTIALS"),
          "429": errorResponse("TOO_MANY_ATTEMPTS o AUTH_BUSY"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Sesión actual y token CSRF",
        responses: {
          "200": { description: "Usuario actual", content: json(envelope(ref("AuthState"))) },
          "401": errorResponse("UNAUTHENTICATED"),
        },
      },
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar nombre y correo de la cuenta",
        requestBody: { required: true, content: json(ref("ProfileInput")) },
        responses: {
          "200": { description: "Perfil actualizado", content: json(envelope(ref("User"))) },
          "400": errorResponse("INVALID_PROFILE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
          "409": errorResponse("ACCOUNT_EXISTS"),
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Desactivar y anonimizar la cuenta; conserva proyectos y registros QA",
        requestBody: { required: true, content: json(ref("AccountDeletionInput")) },
        responses: {
          "204": { description: "Cuenta anonimizada, sesiones revocadas y cookie borrada" },
          "400": errorResponse("INVALID_ACCOUNT_DELETION"),
          "401": errorResponse("INVALID_PASSWORD o UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
        },
      },
    },
    "/api/auth/bug-templates": {
      get: {
        summary: "Listar plantillas privadas del usuario",
        responses: {
          "200": {
            description: "Plantillas de la cuenta",
            content: json(envelope({ type: "array", items: ref("BugTemplate") })),
          },
          "401": errorResponse("UNAUTHENTICATED"),
        },
      },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Crear plantilla personal de bug",
        requestBody: { required: true, content: json(ref("BugTemplateInput")) },
        responses: {
          "201": { description: "Plantilla creada", content: json(envelope(ref("BugTemplate"))) },
          "400": errorResponse("INVALID_TEMPLATE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
          "409": errorResponse("CONFLICT: nombre duplicado en la cuenta."),
        },
      },
    },
    "/api/auth/bug-templates/{templateId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar una plantilla propia",
        parameters: [
          {
            in: "path",
            name: "templateId",
            required: true,
            schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("BugTemplateInput")) },
        responses: {
          "200": {
            description: "Plantilla actualizada",
            content: json(envelope(ref("BugTemplate"))),
          },
          "400": errorResponse("INVALID_TEMPLATE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
          "404": errorResponse("TEMPLATE_NOT_FOUND"),
          "409": errorResponse("CONFLICT: nombre duplicado en la cuenta."),
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar una plantilla propia",
        parameters: [
          {
            in: "path",
            name: "templateId",
            required: true,
            schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
          },
        ],
        responses: {
          "204": { description: "Plantilla eliminada" },
          "400": errorResponse("INVALID_TEMPLATE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
          "404": errorResponse("TEMPLATE_NOT_FOUND"),
        },
      },
    },
    "/api/auth/password": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Cambiar contraseña y revocar las demás sesiones",
        requestBody: { required: true, content: json(ref("PasswordInput")) },
        responses: {
          "204": { description: "Contraseña actualizada" },
          "400": errorResponse("INVALID_PASSWORD"),
          "401": errorResponse("INVALID_PASSWORD o UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
        },
      },
    },
    "/api/auth/logout": {
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Revocar sesión y eliminar cookie; enviar JSON vacío",
        requestBody: { required: true, content: json({ type: "object", example: {} }) },
        responses: {
          "204": { description: "Sesión revocada" },
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
        },
      },
    },
    "/api/health": {
      get: {
        security: [],
        summary: "Disponibilidad de API y conexión PostgreSQL",
        responses: {
          "200": {
            description: "API y base disponibles",
            content: json(
              envelope(
                object(
                  {
                    status: { type: "string", enum: ["ok"] },
                    database: { type: "string", enum: ["postgresql"] },
                  },
                  ["status", "database"],
                ),
              ),
            ),
          },
          "503": unavailable,
        },
      },
    },
    "/api/teams": {
      get: {
        security: [{ sessionCookie: [] }],
        summary: "Listar espacios del usuario",
        responses: {
          "200": { description: "Equipos disponibles" },
          "401": errorResponse("UNAUTHENTICATED"),
        },
      },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Crear un equipo",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", maxLength: 100 } },
          }),
        },
        responses: {
          "201": { description: "Equipo creado" },
          "400": errorResponse("INVALID_TEAM"),
        },
      },
    },
    "/api/teams/{teamId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Renombrar un equipo propio",
        parameters: [{ in: "path", name: "teamId", required: true, schema: projectId }],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", maxLength: 100 } },
          }),
        },
        responses: {
          "204": { description: "Equipo actualizado" },
          "404": errorResponse("TEAM_NOT_FOUND"),
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un equipo vacío",
        parameters: [{ in: "path", name: "teamId", required: true, schema: projectId }],
        responses: {
          "204": { description: "Equipo eliminado" },
          "404": errorResponse("TEAM_NOT_FOUND"),
          "409": errorResponse("TEAM_IN_USE"),
        },
      },
    },
    "/api/teams/{teamId}/members": {
      get: {
        security: [{ sessionCookie: [] }],
        summary: "Listar integrantes del espacio",
        parameters: [{ in: "path", name: "teamId", required: true, schema: projectId }],
        responses: {
          "200": { description: "Integrantes" },
          "404": errorResponse("TEAM_NOT_FOUND"),
        },
      },
    },
    "/api/teams/{teamId}/invitations": {
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Generar código de invitación de un solo uso",
        parameters: [{ in: "path", name: "teamId", required: true, schema: projectId }],
        requestBody: { required: true, content: json({ type: "object" }) },
        responses: {
          "201": { description: "Código secreto y fecha de vencimiento" },
          "404": errorResponse("TEAM_NOT_FOUND"),
        },
      },
    },
    "/api/team-invitations/accept": {
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Aceptar una invitación",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["code"],
            properties: { code: { type: "string", pattern: "^[a-f0-9]{64}$" } },
          }),
        },
        responses: {
          "204": { description: "Invitación aceptada" },
          "400": errorResponse("INVALID_INVITE"),
          "404": errorResponse("INVITE_NOT_FOUND"),
        },
      },
    },
    "/api/teams/{teamId}/members/{memberId}": {
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Retirar a un integrante",
        parameters: [
          { in: "path", name: "teamId", required: true, schema: projectId },
          { in: "path", name: "memberId", required: true, schema: projectId },
        ],
        responses: {
          "204": { description: "Integrante retirado" },
          "404": errorResponse("MEMBER_NOT_FOUND"),
        },
      },
    },
    "/api/projects": {
      get: {
        summary: "Listar proyectos existentes",
        responses: {
          "200": {
            description: "Proyectos",
            content: json(envelope({ type: "array", items: project })),
          },
          "503": unavailable,
        },
      },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Crear un proyecto en el espacio propio",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["name", "description"],
            properties: {
              name: { type: "string", maxLength: 100 },
              description: { type: "string", maxLength: 5000 },
              teamId: {
                type: "string",
                description: "Equipo propietario (opcional para clientes anteriores)",
              },
            },
          }),
        },
        responses: {
          "201": { description: "Proyecto creado", content: json(envelope(project)) },
          "400": errorResponse("INVALID_PROJECT"),
          "403": errorResponse("WORKSPACE_REQUIRED"),
          "409": errorResponse("CONFLICT"),
        },
      },
    },
    "/api/projects/{projectId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Editar un proyecto del espacio propio",
        parameters: [{ in: "path", name: "projectId", required: true, schema: projectId }],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["name", "description"],
            properties: {
              name: { type: "string", maxLength: 100 },
              description: { type: "string", maxLength: 5000 },
            },
          }),
        },
        responses: {
          "200": { description: "Proyecto actualizado", content: json(envelope(project)) },
          "400": errorResponse("INVALID_PROJECT"),
          "404": errorResponse("PROJECT_NOT_FOUND"),
          "409": errorResponse("CONFLICT"),
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un proyecto sin registros vinculados",
        parameters: [{ in: "path", name: "projectId", required: true, schema: projectId }],
        responses: {
          "204": { description: "Proyecto eliminado" },
          "400": errorResponse("INVALID_PROJECT"),
          "404": errorResponse("PROJECT_NOT_FOUND"),
          "409": errorResponse("PROJECT_IN_USE"),
        },
      },
    },
    "/api/tags/{tagId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar un tag de un proyecto autorizado",
        parameters: [{ in: "path", name: "tagId", required: true, schema: projectId }],
        requestBody: { required: true, content: json(ref("TagUpdateInput")) },
        responses: {
          "200": { description: "Tag actualizado", content: json(envelope(ref("Tag"))) },
          "400": errorResponse("INVALID_TAG"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TAG_NOT_FOUND"),
          "409": errorResponse("TAG_ALREADY_EXISTS"),
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un tag y sus asociaciones",
        parameters: [
          { in: "path", name: "tagId", required: true, schema: projectId },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        responses: {
          "204": { description: "Tag eliminado; asociaciones eliminadas en cascada" },
          "400": errorResponse("INVALID_TAG o INVALID_PROJECT_ID"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF"),
          "404": errorResponse("PROJECT_NOT_FOUND o TAG_NOT_FOUND"),
        },
      },
    },
    "/api/bugs/{bugId}/status": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar el estado de un bug en un proyecto autorizado",
        parameters: [
          {
            in: "path",
            name: "bugId",
            required: true,
            schema: { type: "string", pattern: "^BUG-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("BugStatusInput")) },
        responses: {
          "200": { description: "Estado actualizado", content: json(envelope(ref("Bug"))) },
          "400": errorResponse("INVALID_BUG_STATUS"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o BUG_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/bugs/{bugId}": {
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un bug sin casos ni evidencias vinculados",
        parameters: [
          { in: "path", name: "bugId", required: true, schema: { type: "string" } },
          { in: "query", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Bug eliminado" },
          "400": errorResponse("INVALID_BUG"),
          "404": errorResponse("BUG_NOT_FOUND o PROJECT_NOT_FOUND"),
          "409": errorResponse("BUG_IN_USE"),
        },
      },
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar los datos de un bug en un proyecto autorizado",
        parameters: [
          {
            in: "path",
            name: "bugId",
            required: true,
            schema: { type: "string", pattern: "^BUG-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("BugUpdateInput")) },
        responses: {
          "200": { description: "Bug actualizado", content: json(envelope(ref("Bug"))) },
          "400": errorResponse("INVALID_BUG"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o BUG_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/evidence/{evidenceId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar metadatos y vínculo de una evidencia",
        parameters: [
          {
            in: "path",
            name: "evidenceId",
            required: true,
            schema: { type: "string", pattern: "^EVD-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("EvidenceInput")) },
        responses: {
          "200": { description: "Evidencia actualizada", content: json(envelope(ref("Evidence"))) },
          "400": errorResponse("INVALID_EVIDENCE o INVALID_REFERENCE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o EVIDENCE_NOT_FOUND"),
          "503": unavailable,
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar metadatos, archivo y vínculos de una evidencia",
        parameters: [
          {
            in: "path",
            name: "evidenceId",
            required: true,
            schema: { type: "string", pattern: "^EVD-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        requestBody: { required: true, content: json({ type: "object", example: {} }) },
        responses: {
          "204": { description: "Evidencia eliminada" },
          "400": errorResponse("INVALID_EVIDENCE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o EVIDENCE_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/evidence/upload": {
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Guardar un archivo privado de evidencia (máximo 2 MiB)",
        parameters: [
          { in: "query", name: "projectId", required: true, schema: projectId },
          { in: "query", name: "name", required: true, schema: text(255) },
          {
            in: "query",
            name: "related",
            required: false,
            schema: { type: "string", nullable: true, pattern: "^(BUG|TC|RUN|RES)-[0-9]{1,19}$" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/octet-stream": { schema: { type: "string", format: "binary" } },
          },
        },
        responses: {
          "201": { description: "Archivo almacenado", content: json(envelope(ref("Evidence"))) },
          "400": errorResponse("INVALID_EVIDENCE_FILE o INVALID_REFERENCE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "413": errorResponse("PAYLOAD_TOO_LARGE"),
          "503": unavailable,
        },
      },
    },
    "/api/evidence/{evidenceId}/file": {
      get: {
        summary: "Descargar archivo privado de evidencia",
        parameters: [
          {
            in: "path",
            name: "evidenceId",
            required: true,
            schema: { type: "string", pattern: "^EVD-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        responses: {
          "200": {
            description: "Archivo entregado como descarga, sin interpretación en navegador",
            content: {
              "application/octet-stream": { schema: { type: "string", format: "binary" } },
            },
          },
          "400": errorResponse("INVALID_EVIDENCE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "404": errorResponse("EVIDENCE_FILE_NOT_FOUND o PROJECT_NOT_FOUND"),
        },
      },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Subir o reemplazar archivo de una evidencia (máximo 2 MiB)",
        parameters: [
          {
            in: "path",
            name: "evidenceId",
            required: true,
            schema: { type: "string", pattern: "^EVD-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
          { in: "query", name: "name", required: true, schema: text(255) },
        ],
        requestBody: {
          required: true,
          content: {
            "application/octet-stream": { schema: { type: "string", format: "binary" } },
          },
        },
        responses: {
          "200": { description: "Archivo actualizado", content: json(envelope(ref("Evidence"))) },
          "400": errorResponse("INVALID_EVIDENCE_FILE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("EVIDENCE_NOT_FOUND"),
          "413": errorResponse("PAYLOAD_TOO_LARGE"),
        },
      },
    },
    "/api/test-cases/{caseId}/status": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Actualizar el estado de un caso de prueba en un proyecto autorizado",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("TestCaseStatusInput")) },
        responses: {
          "200": { description: "Estado actualizado", content: json(envelope(ref("TestCase"))) },
          "400": errorResponse("INVALID_TEST_CASE_STATUS"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/test-cases/{caseId}": {
      patch: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Editar un caso guardado y reemplazar sus pasos",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("UpdateTestCaseInput")) },
        responses: {
          "200": { description: "Caso actualizado", content: json(envelope(ref("TestCase"))) },
          "400": errorResponse("INVALID_TEST_CASE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"),
          "503": unavailable,
        },
      },
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un caso sin romper relaciones con ejecuciones",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        requestBody: {
          required: true,
          content: json({ type: "object", example: {} }),
        },
        responses: {
          "204": { description: "Caso eliminado" },
          "400": errorResponse("INVALID_TEST_CASE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"),
          "409": errorResponse("TEST_CASE_IN_USE: el caso está referenciado por una ejecución."),
          "503": unavailable,
        },
      },
    },
    "/api/test-cases/{caseId}/attachments": {
      get: {
        summary: "Listar imágenes y enlaces privados de un caso",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        responses: {
          "200": {
            description: "Adjuntos sin contenido binario",
            content: json(envelope({ type: "array", items: ref("TestCaseAttachment") })),
          },
          "401": errorResponse("UNAUTHENTICATED"),
          "404": errorResponse("PROJECT_NOT_FOUND"),
          "503": unavailable,
        },
      },
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Agregar un enlace HTTP o HTTPS a un caso",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
        ],
        requestBody: { required: true, content: json(ref("TestCaseLinkInput")) },
        responses: {
          "201": {
            description: "Enlace agregado",
            content: json(envelope(ref("TestCaseAttachment"))),
          },
          "400": errorResponse("INVALID_CASE_LINK"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/test-cases/{caseId}/attachments/image": {
      post: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Subir una imagen privada PNG, JPEG, GIF o WebP (máximo 2 MB)",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
          { in: "query", name: "name", required: true, schema: { type: "string", maxLength: 255 } },
        ],
        requestBody: {
          required: true,
          content: {
            "image/png": { schema: { type: "string", format: "binary" } },
            "image/jpeg": { schema: { type: "string", format: "binary" } },
            "image/gif": { schema: { type: "string", format: "binary" } },
            "image/webp": { schema: { type: "string", format: "binary" } },
          },
        },
        responses: {
          "201": {
            description: "Imagen validada y guardada en PostgreSQL",
            content: json(envelope(ref("TestCaseAttachment"))),
          },
          "400": errorResponse("INVALID_CASE_IMAGE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("PROJECT_NOT_FOUND o TEST_CASE_NOT_FOUND"),
          "413": errorResponse("Imagen superior a 2 MB"),
          "503": unavailable,
        },
      },
    },
    "/api/test-cases/{caseId}/attachments/{attachmentId}": {
      delete: {
        security: [{ sessionCookie: [], csrfToken: [] }],
        summary: "Eliminar un adjunto propio del caso",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
          {
            in: "path",
            name: "attachmentId",
            required: true,
            schema: { type: "string", pattern: "^TCA-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        requestBody: {
          required: true,
          content: json({ type: "object", example: {} }),
        },
        responses: {
          "204": { description: "Adjunto eliminado" },
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("CASE_ATTACHMENT_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/test-cases/{caseId}/attachments/{attachmentId}/image": {
      get: {
        summary: "Consultar imagen privada de un caso autorizado",
        parameters: [
          {
            in: "path",
            name: "caseId",
            required: true,
            schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          },
          {
            in: "path",
            name: "attachmentId",
            required: true,
            schema: { type: "string", pattern: "^TCA-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        requestBody: {
          required: true,
          content: json({ type: "object", example: {} }),
        },
        responses: {
          "200": { description: "Bytes de imagen con su MIME validado" },
          "401": errorResponse("UNAUTHENTICATED"),
          "404": errorResponse("CASE_IMAGE_NOT_FOUND"),
          "503": unavailable,
        },
      },
    },
    "/api/test-runs/{runId}": {
      patch: {
        summary: "Editar ejecución, seleccionar casos y completar o reabrir",
        security: [{ sessionCookie: [], csrfToken: [] }],
        parameters: [
          {
            in: "path",
            name: "runId",
            required: true,
            schema: { type: "string", pattern: "^RUN-[0-9]{1,19}$" },
          },
        ],
        requestBody: {
          required: true,
          content: json(
            object(
              {
                ...inputs.TestRunInput.properties,
                status: { type: "string", enum: ["En curso", "Completado"] },
              },
              ["projectId", "title", "owner", "caseIds", "status"],
            ),
          ),
        },
        responses: {
          "200": {
            description: "Ejecución actualizada; conserva resultados de los casos mantenidos",
            content: json(envelope(ref("TestRun"))),
          },
          "400": errorResponse("INVALID_TEST_RUN o INVALID_REFERENCE"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("TEST_RUN_NOT_FOUND o PROJECT_NOT_FOUND"),
          "409": errorResponse("RUN_INCOMPLETE o RUN_REFERENCED"),
          "503": unavailable,
        },
      },
      delete: {
        summary: "Eliminar ejecución y resultados sin evidencias vinculadas; conserva casos",
        security: [{ sessionCookie: [], csrfToken: [] }],
        parameters: [
          {
            in: "path",
            name: "runId",
            required: true,
            schema: { type: "string", pattern: "^RUN-[0-9]{1,19}$" },
          },
          { in: "query", name: "projectId", required: true, schema: projectId },
        ],
        requestBody: { required: true, content: json({ type: "object", example: {} }) },
        responses: {
          "204": { description: "Eliminada" },
          "400": errorResponse("INVALID_TEST_RUN"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("TEST_RUN_NOT_FOUND o PROJECT_NOT_FOUND"),
          "409": errorResponse("RUN_REFERENCED"),
          "503": unavailable,
        },
      },
    },
    "/api/test-runs/{runId}/results/{resultId}": {
      patch: {
        summary: "Registrar estado y notas de un caso en una ejecución abierta",
        security: [{ sessionCookie: [], csrfToken: [] }],
        parameters: [
          {
            in: "path",
            name: "runId",
            required: true,
            schema: { type: "string", pattern: "^RUN-[0-9]{1,19}$" },
          },
          {
            in: "path",
            name: "resultId",
            required: true,
            schema: { type: "string", pattern: "^RES-[0-9]{1,19}$" },
          },
        ],
        requestBody: {
          required: true,
          content: json(
            object(
              {
                projectId,
                status: { type: "string", enum: ["passed", "failed", "blocked", "skipped"] },
                notes: { type: "string", maxLength: 10000 },
              },
              ["projectId", "status", "notes"],
            ),
          ),
        },
        responses: {
          "200": {
            description: "Ejecución con resultados y progreso recalculados",
            content: json(envelope(ref("TestRun"))),
          },
          "400": errorResponse("INVALID_RUN_RESULT"),
          "401": errorResponse("UNAUTHENTICATED"),
          "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
          "404": errorResponse("RUN_RESULT_NOT_FOUND o PROJECT_NOT_FOUND"),
          "409": errorResponse("RUN_COMPLETED"),
          "503": unavailable,
        },
      },
    },
    ...Object.fromEntries(
      resources.map(([path, schema, code]) => [
        `/api/${path}`,
        {
          get: {
            summary: `Listar ${path}`,
            tags: [path],
            parameters: [
              { in: "query", name: "projectId", required: path === "tags", schema: projectId },
              ...(["bugs", "test-cases", "test-runs"].includes(path)
                ? [
                    {
                      in: "query",
                      name: "limit",
                      required: false,
                      description:
                        "Requiere projectId. Activa paginación; por defecto 50, máximo 100.",
                      schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
                    },
                    {
                      in: "query",
                      name: "offset",
                      required: false,
                      schema: { type: "integer", minimum: 0, maximum: 1000000, default: 0 },
                    },
                    {
                      in: "query",
                      name: "search",
                      required: false,
                      description: "Búsqueda literal en campos del listado, máximo 200 caracteres.",
                      schema: { type: "string", maxLength: 200 },
                    },
                    {
                      in: "query",
                      name: "status",
                      required: false,
                      schema: {
                        type: "string",
                        enum:
                          path === "bugs"
                            ? undefined
                            : path === "test-cases"
                              ? testCaseStatuses
                              : ["En curso", "Completado"],
                      },
                    },
                  ]
                : []),
            ],
            responses: {
              "200": {
                description: "Colección persistida",
                content: json(envelope({ type: "array", items: ref(schema) })),
              },
              "400": errorResponse("INVALID_PROJECT_ID: filtro inválido."),
              "503": unavailable,
            },
          },
          post: {
            security: [{ sessionCookie: [], csrfToken: [] }],
            summary: `Crear ${path}`,
            tags: [path],
            parameters: ["bugs", "test-cases", "test-runs"].includes(path)
              ? [
                  {
                    in: "header",
                    name: "Idempotency-Key",
                    required: false,
                    description:
                      "UUID estable por creación, usuario y proyecto. Repetir la misma solicitud devuelve el mismo recurso; cambiar datos o repetir una creación eliminada devuelve 409. No activa reintentos automáticos.",
                    schema: { type: "string", format: "uuid" },
                  },
                ]
              : [],
            requestBody: { required: true, content: json(ref(`${schema}Input`)) },
            responses: {
              "201": { description: "Recurso persistido", content: json(envelope(ref(schema))) },
              "400": errorResponse(
                `${code}: campos inválidos; INVALID_JSON; INVALID_REFERENCE: referencia inexistente o de otro proyecto.`,
              ),
              "401": errorResponse("UNAUTHENTICATED"),
              "403": errorResponse("INVALID_CSRF o INVALID_ORIGIN"),
              "404": errorResponse("PROJECT_NOT_FOUND"),
              "409": errorResponse("CONFLICT, REQUEST_KEY_CONFLICT o CREATED_RESOURCE_REMOVED."),
              "413": errorResponse("PAYLOAD_TOO_LARGE: cuerpo superior a 1 MB."),
              "500": errorResponse("INTERNAL_ERROR: error interno."),
              "503": unavailable,
            },
          },
        },
      ]),
    ),
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "qa_session" },
      csrfToken: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description: "Copiar csrfToken de /api/auth/me después de iniciar sesión.",
      },
    },
    schemas: {
      User: object(
        {
          id: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
          name: text(100),
          email: { type: "string", format: "email", maxLength: 254 },
        },
        ["id", "name", "email"],
      ),
      AuthState: object(
        { user: ref("User"), csrfToken: { type: "string", minLength: 64, maxLength: 64 } },
        ["user", "csrfToken"],
      ),
      ProfileInput: object(
        { name: text(100), email: { type: "string", format: "email", maxLength: 254 } },
        ["name", "email"],
      ),
      PasswordInput: object(
        {
          currentPassword: { type: "string", minLength: 1, maxLength: 128, format: "password" },
          newPassword: { type: "string", minLength: 12, maxLength: 128, format: "password" },
        },
        ["currentPassword", "newPassword"],
      ),
      AccountDeletionInput: object(
        {
          currentPassword: { type: "string", minLength: 1, maxLength: 128, format: "password" },
          confirmation: { type: "string", enum: ["ELIMINAR CUENTA"] },
        },
        ["currentPassword", "confirmation"],
      ),
      BugTemplateInput: object(
        {
          name: text(100),
          title: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
          priority: { type: "string", enum: bugPriorities },
        },
        ["name", "title", "description", "priority"],
      ),
      BugTemplate: object(
        {
          id: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
          name: text(100),
          title: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
          priority: { type: "string", enum: bugPriorities },
          createdAt: { type: "string", format: "date-time" },
        },
        ["id", "name", "title", "description", "priority", "createdAt"],
      ),
      BugStatusInput: object(
        {
          projectId,
          status: {
            type: "string",
            minLength: 1,
            maxLength: 60,
            description: "Vocabulario y transiciones definidos en /api/bug-workflow",
          },
        },
        ["projectId", "status"],
      ),
      TestCaseStatusInput: object(
        { projectId, status: { type: "string", enum: testCaseStatuses } },
        ["projectId", "status"],
      ),
      UpdateTestCaseInput: object(
        {
          projectId,
          title: text(200),
          suite: { type: "string", maxLength: 100 },
          preconditions: { type: "string", maxLength: 10000 },
          assigneeUserId: { type: "string", nullable: true, pattern: "^[1-9][0-9]{0,18}$" },
          steps: { type: "array", maxItems: 100, items: step },
        },
        ["projectId", "title"],
      ),
      TestCaseLinkInput: object(
        {
          projectId,
          name: text(255),
          url: { type: "string", format: "uri", maxLength: 2048, pattern: "^https?://" },
        },
        ["projectId", "name", "url"],
      ),
      TestCaseAttachment: object(
        {
          id: { type: "string", pattern: "^TCA-[0-9]{1,19}$" },
          projectId,
          testCaseId: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          kind: { type: "string", enum: ["image", "link"] },
          name: text(255),
          url: { type: "string", nullable: true },
          mediaType: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
        ["id", "projectId", "testCaseId", "kind", "name", "createdAt"],
      ),
      ...inputs,
      BugUpdateInput: object(
        {
          ...inputs.BugInput.properties,
          status: {
            type: "string",
            minLength: 1,
            maxLength: 60,
            description: "Vocabulario y transiciones definidos en /api/bug-workflow",
          },
        },
        ["projectId", "title", "priority"],
      ),
      Bug: object(
        {
          ...inputs.BugInput.properties,
          ...common,
          sourceCaseId: { type: "string", nullable: true },
          sourceRunId: { type: "string", nullable: true },
          sourceSteps: { type: "array", items: step },
          project: text(100),
          description: { type: "string" },
          assignee: { type: "string", nullable: true },
          status: {
            type: "string",
            minLength: 1,
            maxLength: 60,
            description: "Vocabulario y transiciones definidos en /api/bug-workflow",
          },
          tagIds,
        },
        [
          "id",
          "projectId",
          "title",
          "project",
          "priority",
          "description",
          "status",
          "assignee",
          "createdAt",
          "tagIds",
        ],
      ),
      TestCase: object(
        {
          ...inputs.TestCaseInput.properties,
          ...common,
          status: { type: "string", enum: testCaseStatuses },
          version: { type: "integer", minimum: 1 },
          assigneeName: { type: "string", nullable: true },
          tagIds,
        },
        [
          "id",
          "projectId",
          "title",
          "suite",
          "preconditions",
          "steps",
          "status",
          "createdAt",
          "tagIds",
        ],
      ),
      TestRun: object(
        {
          ...inputs.TestRunInput.properties,
          ...common,
          caseCount: { type: "integer", minimum: 0 },
          progress: { type: "number", minimum: 0, maximum: 100 },
          results: { type: "array", items: ref("TestRunResult") },
          status: { type: "string", enum: ["En curso", "Completado"] },
          tagIds,
        },
        [
          "id",
          "projectId",
          "title",
          "owner",
          "caseIds",
          "caseCount",
          "progress",
          "results",
          "status",
          "createdAt",
          "tagIds",
        ],
      ),
      TestRunResult: object(
        {
          id: { type: "string", pattern: "^RES-[0-9]{1,19}$" },
          caseId: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
          caseVersion: { type: "integer", minimum: 1 },
          title: text(200),
          status: { type: "string", enum: ["passed", "failed", "blocked", "skipped"] },
          notes: { type: "string", maxLength: 10000 },
          executedAt: { type: "string", format: "date-time", nullable: true },
          steps: { type: "array", items: step },
        },
        ["id", "caseId", "title", "status", "notes", "executedAt", "steps"],
      ),
      TagInput: object(
        {
          projectId,
          name: text(50),
          color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        },
        ["projectId", "name", "color"],
      ),
      TagUpdateInput: object(
        { projectId, name: text(50), color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" } },
        ["projectId", "name", "color"],
      ),
      Tag: object(
        {
          id: projectId,
          projectId,
          name: text(50),
          color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
          createdAt: { type: "string", format: "date-time" },
        },
        ["id", "projectId", "name", "color", "createdAt"],
      ),
      Evidence: object(
        {
          ...inputs.EvidenceInput.properties,
          ...common,
          related: { type: "array", items: { type: "string" } },
          hasFile: { type: "boolean" },
        },
        ["id", "projectId", "name", "type", "sizeBytes", "hasFile", "related", "createdAt"],
      ),
      Error: object(
        {
          error: object({ code: { type: "string" }, message: { type: "string" } }, [
            "code",
            "message",
          ]),
        },
        ["error"],
      ),
    },
  },
};
