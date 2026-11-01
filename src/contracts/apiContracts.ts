import { auditSettingsSchema } from "../../backend/src/models/audit.model";
import {
  analyticsSchema,
  requirementSchema,
  requirementsSchema,
  coverageSchema,
  runReportSchema,
  importResultSchema,
} from "./analyticsContracts";
import { z } from "zod";

const id = z.string().min(1).max(120);
const text = z.string().max(10000);
const user = z.object({ id, name: text, email: text });
const role = z.enum(["Admin", "QA", "Dev", "Solo lectura"]);
const project = z.object({
  id,
  organizationId: id,
  name: text,
  description: text,
  role: role.default("Solo lectura"),
});
const tags = z.array(id).default([]);
const base = { id, projectId: id, createdAt: text };
const bug = z.object({
  ...base,
  title: text,
  project: text,
  description: text.default(""),
  priority: z.enum(["Crítica", "Alta", "Media", "Baja"]),
  status: z.string().min(1).max(60),
  severity: z.enum(["Crítica", "Alta", "Media", "Baja"]).optional(),
  environment: text.optional(),
  affectedVersion: text.optional(),
  sourceResultId: id.nullable().optional(),
  sourceCaseId: id.nullable().optional(),
  sourceRunId: id.nullable().optional(),
  sourceSteps: z.array(z.object({ action: text, expectedResult: text })).optional(),
  assignee: text.nullable(),
  assigneeUserId: id.nullable().optional(),
  tagIds: tags,
});
const step = z.object({ action: text, expectedResult: text });
const testCase = z.object({
  ...base,
  title: text,
  suite: text.nullable().transform((value) => value ?? ""),
  testType: z.string().min(1).max(100).optional(),
  lifecycle: z.enum(["Borrador", "Listo", "Obsoleto"]).optional(),
  version: z.number().int().positive().optional(),
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
  caseVersion: z.number().int().positive().optional(),
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
  planId: id.nullable().optional(),
  sourceRunId: id.nullable().optional(),
  caseIds: z.array(id),
  caseCount: z.number().int().nonnegative(),
  progress: z.number().min(0).max(100),
  status: z.enum(["En curso", "Completado"]),
  results: z.array(runResult),
  tagIds: tags,
});
const plan = z.object({
  id,
  projectId: id,
  name: text,
  description: text,
  caseIds: z.array(id),
  revision: z.number().int().positive(),
});
const workflow = z.object({
  states: z.array(z.string().min(1).max(60)).min(1),
  closedStates: z.array(z.string()).optional(),
  transitions: z.record(z.string(), z.array(z.string())),
  revision: z.number().int().positive(),
});
const history = z.object({
  version: z.number().int().positive(),
  changedAt: text,
  snapshot: z
    .object({
      title: text,
      suite: text.nullable(),
      test_type: text,
      lifecycle: text,
      steps: z.array(step),
      preconditions: text,
    })
    .passthrough(),
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

const resourceTarget = z.object({ kind: z.enum(["bug", "case", "run"]), id });
const projectMember = z.object({
  id,
  name: text,
  role: role.nullable(),
  owner: z.boolean(),
  revision: z.number().int().nonnegative(),
});
const comment = z.object({
  ...base,
  target: resourceTarget,
  authorId: id,
  authorName: text,
  body: z.string().max(5000),
  version: z.number().int().positive(),
  editedAt: text.nullable(),
  deletedAt: text.nullable(),
  mentions: z.array(z.object({ id, name: text })).max(20),
});
const activity = z.object({
  ...base,
  kind: text,
  resourceId: id,
  action: text,
  actorId: id.nullable(),
  actorName: text,
  before: z.unknown(),
  after: z.unknown(),
  requestId: text.nullable(),
});
const notification = z.object({
  id,
  commentId: id,
  target: resourceTarget,
  authorName: text,
  createdAt: text,
  readAt: text.nullable(),
});
export type ApiBug = z.output<typeof bug>;
export type ApiCase = z.output<typeof testCase>;
export type ApiRun = z.output<typeof run>;
export type ApiEvidence = z.output<typeof evidence>;

export function parseApiData(path: string, method: string, input: unknown): unknown {
  const url = new URL(path, "http://contracts.local");
  const parts = url.pathname.split("/").filter(Boolean);
  const [resource, action, detail] = parts;
  let schema: z.ZodType;
  if (resource === "analytics") schema = analyticsSchema;
  else if (resource === "requirements")
    schema = method === "GET" ? requirementsSchema : requirementSchema;
  else if (resource === "coverage-matrix") schema = coverageSchema;
  else if (resource === "imports" && action === "tags") schema = importResultSchema;
  else if (resource === "test-runs" && detail === "report") schema = runReportSchema;
  else if (resource === "audit-settings") schema = auditSettingsSchema;
  else if (resource === "project-users") schema = projectMember;
  else if (resource === "mention-notifications" && url.pathname.endsWith("/read-all"))
    schema = z.object({ updated: z.number().int().nonnegative(), readAt: text });
  else if (resource === "project-members") schema = z.array(projectMember);
  else if (resource === "comments") schema = method === "GET" ? z.array(comment) : comment;
  else if (resource === "activity") schema = z.array(activity);
  else if (resource === "mention-notifications") schema = z.array(notification);
  else if (resource === "bug-workflow") schema = workflow;
  else if (resource === "test-plans") schema = method === "GET" ? z.array(plan) : plan;
  else if (resource === "test-cases" && detail === "history") schema = z.array(history);
  else if (resource === "auth") {
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
