const text = { type: "string" };
const revision = { type: "integer", minimum: 1 };
const project = {
  name: "projectId",
  in: "query",
  required: true,
  schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
};
const planInput = {
  type: "object",
  required: ["projectId", "name", "description", "caseIds"],
  properties: {
    projectId: text,
    name: { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 5000 },
    caseIds: {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      uniqueItems: true,
      items: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
    },
    revision,
  },
};
const plan = {
  ...planInput,
  required: ["id", "projectId", "name", "description", "caseIds", "revision"],
  properties: { ...planInput.properties, id: text },
};
const workflow = {
  type: "object",
  required: ["states", "transitions", "revision"],
  properties: {
    closedStates: {
      type: "array",
      maxItems: 20,
      uniqueItems: true,
      items: text,
      description: "Estados que cuentan como resueltos en métricas",
    },
    states: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string", minLength: 1, maxLength: 60 },
    },
    transitions: {
      type: "object",
      additionalProperties: { type: "array", uniqueItems: true, items: text },
    },
    revision,
  },
};
function operation(
  summary: string,
  schema: object,
  parameters: object[] = [],
  input?: object,
  created = false,
) {
  return {
    summary,
    security: [{ sessionCookie: [], csrfToken: [] }],
    parameters,
    ...(input
      ? { requestBody: { required: true, content: { "application/json": { schema: input } } } }
      : {}),
    responses: {
      [created ? "201" : "200"]: {
        description: "Operación completada",
        content: {
          "application/json": {
            schema: { type: "object", required: ["data"], properties: { data: schema } },
          },
        },
      },
      "400": { description: "Entrada o referencia inválida" },
      "401": { description: "Sesión requerida" },
      "403": { description: "CSRF inválido" },
      "404": { description: "Proyecto o recurso no disponible" },
      "409": { description: "Conflicto de revisión, estado en uso o referencia existente" },
    },
  };
}
const planPath = {
  name: "planId",
  in: "path",
  required: true,
  schema: { type: "string", pattern: "^PLAN-[0-9]{1,19}$" },
};
export const qualityPaths = {
  "/api/test-plans": {
    get: operation("Listar planes del proyecto", { type: "array", items: plan }, [project]),
    post: operation("Crear plan con casos del mismo proyecto", plan, [], planInput, true),
  },
  "/api/test-plans/{planId}": {
    patch: operation("Editar plan con revisión obligatoria", plan, [planPath], {
      ...planInput,
      required: [...planInput.required, "revision"],
    }),
    delete: {
      summary: "Eliminar plan sin ejecuciones",
      security: [{ sessionCookie: [], csrfToken: [] }],
      parameters: [project, planPath],
      responses: {
        "204": { description: "Eliminado" },
        "404": { description: "No disponible" },
        "409": { description: "Plan en uso" },
      },
    },
  },
  "/api/bug-workflow": {
    get: operation("Consultar vocabulario y transiciones del proyecto", workflow, [project]),
    put: operation(
      "Guardar flujo; conserva estados en uso y comprueba revisión",
      workflow,
      [project],
      workflow,
    ),
  },
  "/api/test-cases/{caseId}/history": {
    get: operation(
      "Consultar versiones históricas del caso",
      {
        type: "array",
        items: {
          type: "object",
          required: ["version", "changedAt", "snapshot"],
          properties: {
            version: revision,
            changedAt: { type: "string", format: "date-time" },
            snapshot: {
              type: "object",
              description: "Caso y pasos de esta versión; no se modifica al editar el caso actual.",
            },
          },
        },
      },
      [
        project,
        {
          name: "caseId",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^TC-[0-9]{1,19}$" },
        },
      ],
    ),
  },
};
