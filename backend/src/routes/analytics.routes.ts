import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../http-error.js";
import { repository } from "../repositories/repository.js";
import { creationContext } from "../repositories/creation-request.js";
import { projectFilter, parseReference, isId } from "../validation.js";
const router = Router();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
export const rangeInput = z
  .object({ from: date, to: date })
  .refine((v) => v.from <= v.to && (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 365);
const page = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10000000).default(0),
  search: z.string().trim().max(200).default(""),
});
const ref = (prefix: string) => z.string().refine((v) => parseReference(v, prefix) !== null);
export const requirementInput = z.object({
  projectId: z.string().refine(isId),
  code: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000),
  caseIds: z
    .array(ref("TC"))
    .max(100)
    .refine((v) => new Set(v).size === v.length),
});
export const tagImportInput = z
  .object({
    rows: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(50),
          color: z.string().regex(/^#[0-9a-f]{6}$/i),
        }),
      )
      .min(1)
      .max(1000),
  })
  .refine((v) => new Set(v.rows.map((r) => r.name.toLowerCase())).size === v.rows.length);
function analytics(req: Parameters<typeof repository>[0]) {
  const a = repository(req).analytics;
  if (!a) throw new HttpError(503, "ANALYTICS_UNAVAILABLE", "Analítica no disponible.");
  return a;
}
function project(req: Parameters<typeof projectFilter>[0]) {
  const p = projectFilter(req);
  if (!p) throw new HttpError(400, "PROJECT_REQUIRED", "Selecciona un proyecto.");
  return p;
}
function valid<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(400, "INVALID_INPUT", "Revisa los campos y límites de la solicitud.");
  return result.data;
}
router.get("/analytics", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const range = valid(rangeInput, { from: req.query.from ?? from, to: req.query.to ?? today });
  res.json({ data: await analytics(req).overview(project(req), range) });
});
router.get("/requirements", async (req, res) => {
  const p = valid(page, req.query);
  res.json({ data: await analytics(req).requirements(project(req), p.limit, p.offset, p.search) });
});
router.post("/requirements", async (req, res) => {
  const input = valid(requirementInput, req.body);
  const context = creationContext(req, res);
  if (!context) throw new HttpError(400, "REQUEST_KEY_REQUIRED", "Falta la clave de creación.");
  res
    .status(201)
    .json({ data: await analytics(req).saveRequirement(input.projectId, null, input, context) });
});
router.patch("/requirements/:id", async (req, res) => {
  const id = valid(ref("REQ"), req.params.id);
  const input = valid(requirementInput.extend({ version: z.number().int().positive() }), req.body);
  res.json({
    data: await analytics(req).saveRequirement(input.projectId, parseReference(id, "REQ")!, input),
  });
});
router.delete("/requirements/:id", async (req, res) => {
  const id = valid(ref("REQ"), req.params.id);
  const version = valid(z.coerce.number().int().positive(), req.query.version);
  await analytics(req).deleteRequirement(project(req), parseReference(id, "REQ")!, version);
  res.status(204).end();
});
router.get("/coverage-matrix", async (req, res) => {
  const p = valid(page, req.query);
  const id =
    req.query.requirementId === undefined
      ? undefined
      : parseReference(valid(ref("REQ"), req.query.requirementId), "REQ")!;
  res.json({
    data: await analytics(req).coverage(
      project(req),
      p.limit,
      p.offset,
      id,
      req.query.caseId === undefined
        ? undefined
        : parseReference(valid(ref("TC"), req.query.caseId), "TC")!,
      req.query.bugId === undefined
        ? undefined
        : parseReference(valid(ref("BUG"), req.query.bugId), "BUG")!,
    ),
  });
});
router.post("/coverage-links", async (req, res) => {
  const b = valid(
    z.object({ requirementId: ref("REQ"), caseId: ref("TC"), bugId: ref("BUG") }),
    req.body,
  );
  await analytics(req).linkCaseBug(
    project(req),
    parseReference(b.requirementId, "REQ")!,
    parseReference(b.caseId, "TC")!,
    parseReference(b.bugId, "BUG")!,
  );
  res.status(204).end();
});
router.get("/test-runs/:runId/report", async (req, res) => {
  const id = valid(ref("RUN"), req.params.runId);
  res.json({ data: await analytics(req).runReport(project(req), parseReference(id, "RUN")!) });
});
router.post("/imports/tags", async (req, res) => {
  const input = valid(tagImportInput, req.body);
  const context = creationContext(req, res);
  if (!context) throw new HttpError(400, "REQUEST_KEY_REQUIRED", "Falta la clave de importación.");
  res.json({ data: await analytics(req).importTags(project(req), input.rows, context) });
});
export default router;
