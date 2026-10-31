const id = { type: "string", pattern: "^[1-9][0-9]{0,18}$" };
const text = { type: "string" };
const revision = { type: "integer", minimum: 1 };
const target = {
  type: "object",
  required: ["kind", "id"],
  properties: {
    kind: { type: "string", enum: ["bug", "case", "run"] },
    id: { type: "string", pattern: "^(BUG|TC|RUN)-[0-9]{1,19}$" },
  },
};
const member = {
  type: "object",
  required: ["id", "name", "role", "owner", "revision"],
  properties: {
    id,
    name: text,
    role: { type: "string", nullable: true, enum: ["Admin", "QA", "Dev", "Solo lectura", null] },
    owner: { type: "boolean" },
    revision: { type: "integer", minimum: 0 },
  },
};
const comment = {
  type: "object",
  required: [
    "id",
    "projectId",
    "target",
    "authorId",
    "authorName",
    "body",
    "version",
    "createdAt",
    "editedAt",
    "deletedAt",
    "mentions",
  ],
  properties: {
    id: { type: "string", pattern: "^CMT-[0-9]{1,19}$" },
    projectId: id,
    target,
    authorId: id,
    authorName: text,
    body: { type: "string", maxLength: 5000 },
    version: revision,
    createdAt: { type: "string", format: "date-time" },
    editedAt: { type: "string", nullable: true },
    deletedAt: { type: "string", nullable: true },
    mentions: {
      type: "array",
      maxItems: 20,
      items: { type: "object", required: ["id", "name"], properties: { id, name: text } },
    },
  },
};
const activity = {
  type: "object",
  required: [
    "id",
    "projectId",
    "kind",
    "resourceId",
    "action",
    "actorId",
    "actorName",
    "createdAt",
    "before",
    "after",
    "requestId",
  ],
  properties: {
    id,
    projectId: id,
    kind: text,
    resourceId: text,
    action: text,
    actorId: { ...id, nullable: true },
    actorName: text,
    createdAt: { type: "string", format: "date-time" },
    before: { type: "object", nullable: true },
    after: { type: "object", nullable: true },
    requestId: { type: "string", nullable: true },
  },
};
const notification = {
  type: "object",
  required: ["id", "commentId", "target", "authorName", "createdAt", "readAt"],
  properties: {
    id: text,
    commentId: text,
    target,
    authorName: text,
    createdAt: text,
    readAt: { type: "string", nullable: true },
  },
};
const project = { name: "projectId", in: "query", required: true, schema: id };
const targetQuery = [
  {
    name: "kind",
    in: "query",
    required: true,
    schema: { type: "string", enum: ["bug", "case", "run"] },
  },
  { name: "resourceId", in: "query", required: true, schema: target.properties.id },
];
const array = (items: object) => ({ type: "array", items });
function operation(
  summary: string,
  response: object | null,
  parameters: object[] = [],
  body?: object,
  created = false,
) {
  return {
    summary,
    security: [{ sessionCookie: [], csrfToken: [] }],
    parameters: [project, ...parameters],
    ...(body
      ? { requestBody: { required: true, content: { "application/json": { schema: body } } } }
      : {}),
    responses: {
      [response ? (created ? "201" : "200") : "204"]: {
        description: "Operación completada",
        ...(response
          ? {
              content: {
                "application/json": {
                  schema: { type: "object", required: ["data"], properties: { data: response } },
                },
              },
            }
          : {}),
      },
      "400": { description: "Entrada inválida o mención sin acceso al proyecto" },
      "401": { description: "Sesión requerida" },
      "403": { description: "Permisos o CSRF insuficientes" },
      "404": { description: "Proyecto, recurso o aviso no disponible" },
      "409": {
        description: "Revisión obsoleta, propietario protegido o conflicto de idempotencia",
      },
    },
  };
}
const path = (name: string) => ({ name, in: "path", required: true, schema: text });
export const collaborationPaths = {
  "/api/project-members": {
    get: operation(
      "Directorio de integrantes con acceso; candidates=true exige Admin",
      array(member),
      [{ name: "candidates", in: "query", schema: { type: "string", enum: ["true"] } }],
    ),
  },
  "/api/project-members/{userId}": {
    put: operation(
      "Asignar/cambiar/revocar rol: Admin del proyecto; propietario protegido",
      null,
      [path("userId")],
      {
        type: "object",
        required: ["role", "revision"],
        properties: { role: member.properties.role, revision: member.properties.revision },
      },
    ),
  },
  "/api/comments": {
    get: operation(
      "Últimos 100 comentarios del recurso, incluidos eliminados lógicos",
      array(comment),
      targetQuery,
    ),
    post: operation(
      "Publicar comentario; menciones @[Nombre](user:ID) o @Nombre completo único, solo a integrantes activos con acceso. Nombres ambiguos requieren selección. Sin avisos para automenciones.",
      comment,
      [
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      {
        type: "object",
        required: ["target", "body"],
        properties: { target, body: { type: "string", minLength: 1, maxLength: 5000 } },
      },
      true,
    ),
  },
  "/api/comments/{commentId}": {
    patch: operation(
      "Editar comentario propio o como Admin; revisión obligatoria",
      comment,
      [path("commentId")],
      {
        type: "object",
        required: ["body", "version"],
        properties: { body: { type: "string", minLength: 1, maxLength: 5000 }, version: revision },
      },
    ),
    delete: operation(
      "Eliminar lógicamente comentario propio o como Admin; conserva auditoría",
      comment,
      [path("commentId")],
      { type: "object", required: ["version"], properties: { version: revision } },
    ),
  },
  "/api/activity": {
    get: operation(
      "Auditoría inmutable: hasta 50 cambios confirmados, cursor before descendente",
      array(activity),
      [
        ...targetQuery.map((p) => ({ ...p, required: false })),
        { name: "before", in: "query", schema: id },
      ],
    ),
  },
  "/api/mention-notifications": {
    get: operation("Últimos 100 avisos propios visibles en el proyecto", array(notification)),
  },
  "/api/mention-notifications/{notificationId}": {
    patch: operation(
      "Marcar aviso propio como leído; idempotente",
      null,
      [path("notificationId")],
      { type: "object", properties: {} },
    ),
  },
};
