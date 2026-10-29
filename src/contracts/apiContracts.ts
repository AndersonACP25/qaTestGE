import { z } from "zod";

const id = z.string().min(1).max(120);
const text = z.string().max(10000);
const user = z.object({ id, name: text, email: text });
const project = z.object({ id, organizationId: id, name: text, description: text });
const tags = z.array(id).default([]);
const base = { id, projectId: id, createdAt: text };
const bug = z.object({
  ...base,
  title: text,
  project: text,
  description: text.default(""),
  priority: z.enum(["Crítica", "Alta", "Media", "Baja"]),
  status: z.enum(["Abierto", "En progreso", "En revisión", "Resuelto"]),
  assignee: text.nullable(),
  assigneeUserId: id.nullable().optional(),
  tagIds: tags,
});
const step = z.object({ action: text, expectedResult: text });
const testCase = z.object({
  ...base,
  title: text,
  suite: text.nullable().transform((value) => value ?? ""),
  preconditions: text.default(""),
  status: z.enum(["Pendiente", "Aprobado", "Fallido"]),
  steps: z.array(step),
  tagIds: tags,
  assigneeUserId: id.nullable().optional(),
  assigneeName: text.nullable().optional(),
});
const runResult = z.object({
  id,
  caseId: id,
  title: text,
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  notes: text,
  executedAt: text.nullable(),
  steps: z.array(step),
});
const run = z.object({
  ...base,
  title: text,
  owner: text,
  caseIds: z.array(id),
  caseCount: z.number().int().nonnegative(),
  progress: z.number().min(0).max(100),
  status: z.enum(["En curso", "Completado"]),
  results: z.array(runResult),
  tagIds: tags,
});
const evidence = z.object({
  ...base,
  name: text,
  type: z.enum(["Imagen", "Video", "Archivo"]),
  related: z.array(id),
  sizeBytes: z.number().int().nonnegative(),
  hasFile: z.boolean().default(false),
});
const tag = z.object({ ...base, name: text, color: text });
const template = z.object({
  id,
  name: text,
  title: text,
  description: text,
  priority: z.enum(["Crítica", "Alta", "Media", "Baja"]),
  createdAt: text,
});
const attachment = z.object({
  ...base,
  testCaseId: id,
  kind: z.enum(["image", "link"]),
  name: text,
  url: text.nullable(),
  mediaType: text.nullable(),
});
const team = z.object({ id, name: text, role: z.enum(["owner", "member"]) });
const member = z.object({ id, name: text, role: z.enum(["owner", "member"]).optional() });
const session = z.object({ user, csrfToken: text.min(1) });

export type ApiBug = z.output<typeof bug>;
export type ApiCase = z.output<typeof testCase>;
export type ApiRun = z.output<typeof run>;
export type ApiEvidence = z.output<typeof evidence>;

export function parseApiData(path: string, method: string, input: unknown): unknown {
  const url = new URL(path, "http://contracts.local");
  const parts = url.pathname.split("/").filter(Boolean);
  const [resource, action, detail] = parts;
  let schema: z.ZodType;
  if (resource === "auth") {
    if (action === "bug-templates")
      schema = parts.length === 2 && method === "GET" ? z.array(template) : template;
    else if (action === "me" && method === "PATCH") schema = user;
    else schema = session;
  } else if (resource === "health")
    schema = z.object({ status: z.literal("ok"), database: z.literal("postgresql") });
  else if (resource === "projects")
    schema = method === "GET" && parts.length === 1 ? z.array(project) : project;
  else if (resource === "teams") {
    if (detail === "members") schema = z.array(member);
    else if (detail === "invitations") schema = z.object({ code: text, expiresAt: text });
    else schema = method === "GET" ? z.array(team) : team;
  } else {
    const domain =
      resource === "bugs"
        ? bug
        : resource === "test-cases"
          ? parts.includes("attachments")
            ? attachment
            : testCase
          : resource === "test-runs"
            ? run
            : resource === "evidence"
              ? evidence
              : resource === "tags"
                ? tag
                : undefined;
    if (!domain) throw new Error("Contrato de respuesta no registrado.");
    schema =
      method === "GET" && (parts.length === 1 || detail === "attachments")
        ? z.array(domain)
        : domain;
  }
  return schema.parse(input);
}

export function parseApiEnvelope(input: unknown): unknown {
  return z.object({ data: z.unknown().refine((value) => value !== undefined) }).parse(input).data;
}
