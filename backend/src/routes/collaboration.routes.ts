import {
  auditSettingsSchema,
  auditFiltersSchema,
  provisionUserSchema,
} from "../models/audit.model.js";
import { Router } from "express";
import { z } from "zod";
import { repository } from "../repositories/repository.js";
import { HttpError } from "../http-error.js";
import { isId, parseReference, projectFilter } from "../validation.js";
import { projectRoles, type ResourceTarget } from "../models/collaboration.model.js";
const router = Router();
const targetSchema = z
  .object({ kind: z.enum(["bug", "case", "run"]), id: z.string() })
  .refine((t) => parseReference(t.id, { bug: "BUG", case: "TC", run: "RUN" }[t.kind]) !== null);
const bodySchema = z.string().trim().min(1).max(5000);
function collab(request: Parameters<typeof repository>[0]) {
  const r = repository(request).collaboration;
  if (!r) throw new HttpError(503, "COLLABORATION_UNAVAILABLE", "Colaboración no disponible.");
  return r;
}
function project(request: Parameters<typeof projectFilter>[0]) {
  const p = projectFilter(request);
  if (!p) throw new HttpError(400, "INVALID_PROJECT", "Selecciona un proyecto.");
  return p;
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Revisa el contenido, identificadores y revisión de la solicitud.",
    );
  return r.data;
}
router.get("/audit-settings", async (req, res) => {
  res.json({ data: await collab(req).auditSettings(project(req)) });
});
router.put("/audit-settings", async (req, res) => {
  res.json({
    data: await collab(req).saveAuditSettings(project(req), parse(auditSettingsSchema, req.body)),
  });
});
router.post("/project-users", async (req, res) => {
  const key = parse(z.uuid(), req.get("Idempotency-Key"));
  res.status(201).json({
    data: await collab(req).createProjectUser(
      project(req),
      parse(provisionUserSchema, req.body),
      key,
    ),
  });
});
router.get("/project-members", async (req, res) => {
  const candidates = req.query.candidates;
  if (candidates !== undefined && candidates !== "true")
    throw new HttpError(400, "INVALID_INPUT", "Filtro inválido.");
  res.json({ data: await collab(req).members(project(req), candidates === "true") });
});
router.put("/project-members/:userId", async (req, res) => {
  if (!isId(req.params.userId)) throw new HttpError(400, "INVALID_MEMBER", "Integrante inválido.");
  const b = parse(
    z.object({ role: z.enum(projectRoles).nullable(), revision: z.number().int().nonnegative() }),
    req.body,
  );
  await collab(req).saveMember(project(req), req.params.userId, b.role, b.revision);
  res.status(204).end();
});
router.get("/comments", async (req, res) => {
  const t = parse(targetSchema, { kind: req.query.kind, id: req.query.resourceId });
  res.json({ data: await collab(req).comments(project(req), t) });
});
router.post("/comments", async (req, res) => {
  const b = parse(z.object({ target: targetSchema, body: bodySchema }), req.body);
  const key = parse(z.uuid(), req.get("Idempotency-Key"));
  res
    .status(201)
    .json({ data: await collab(req).createComment(project(req), b.target, b.body, key) });
});
router.patch("/comments/:commentId", async (req, res) => {
  const id = parseReference(req.params.commentId, "CMT");
  if (!id) throw new HttpError(400, "INVALID_COMMENT", "Comentario inválido.");
  const b = parse(z.object({ body: bodySchema, version: z.number().int().positive() }), req.body);
  res.json({ data: await collab(req).editComment(project(req), id, b.body, b.version, false) });
});
router.delete("/comments/:commentId", async (req, res) => {
  const id = parseReference(req.params.commentId, "CMT");
  if (!id) throw new HttpError(400, "INVALID_COMMENT", "Comentario inválido.");
  const b = parse(z.object({ version: z.number().int().positive() }), req.body);
  res.json({ data: await collab(req).editComment(project(req), id, "", b.version, true) });
});
router.get("/activity", async (req, res) => {
  let t: ResourceTarget | undefined;
  if (req.query.resourceId !== undefined)
    t = parse(targetSchema, { kind: req.query.kind, id: req.query.resourceId });
  if (req.query.before !== undefined && !isId(req.query.before))
    throw new HttpError(400, "INVALID_CURSOR", "Cursor inválido.");
  const filters = parse(auditFiltersSchema, req.query);
  res.json({
    data: await collab(req).activity(
      project(req),
      t,
      typeof req.query.before === "string" ? req.query.before : undefined,
      filters,
    ),
  });
});
router.get("/mention-notifications", async (req, res) => {
  res.json({ data: await collab(req).notifications(project(req)) });
});
router.patch("/mention-notifications/read-all", async (req, res) => {
  res.json({ data: await collab(req).readAllNotifications(project(req)) });
});
router.patch("/mention-notifications/:notificationId", async (req, res) => {
  const id = parseReference(req.params.notificationId, "NTF");
  if (!id) throw new HttpError(400, "INVALID_NOTIFICATION", "Aviso inválido.");
  await collab(req).readNotification(project(req), id);
  res.status(204).end();
});
export default router;
