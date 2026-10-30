import { creationContext } from "../repositories/creation-request.js";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../http-error.js";
import { repository } from "../repositories/repository.js";
import { isId, parseReference, projectFilter } from "../validation.js";
const title = z.string().trim().min(1).max(200);
const caseId = z.string().refine((v) => parseReference(v, "TC") !== null);
const planInput = z.object({
  name: title,
  description: z.string().max(5000),
  caseIds: z
    .array(caseId)
    .min(1)
    .max(1000)
    .refine((v) => new Set(v).size === v.length),
  revision: z.number().int().positive().optional(),
});
const state = z.string().trim().min(1).max(60);
export const workflowInput = z
  .object({
    closedStates: z.array(state).max(20).optional(),
    states: z
      .array(state)
      .min(1)
      .max(20)
      .refine((v) => new Set(v).size === v.length),
    transitions: z.record(state, z.array(state).max(20)),
    revision: z.number().int().positive(),
  })
  .refine(
    (v) =>
      (!v.closedStates ||
        (new Set(v.closedStates).size === v.closedStates.length &&
          v.closedStates.every((s) => v.states.includes(s)))) &&
      Object.keys(v.transitions).length === v.states.length &&
      v.states.every(
        (s) =>
          Object.hasOwn(v.transitions, s) &&
          new Set(v.transitions[s]).size === v.transitions[s].length &&
          v.transitions[s].every((t) => v.states.includes(t) && t !== s),
      ),
  );
const router = Router();
function quality(request: Parameters<typeof repository>[0]) {
  const result = repository(request).quality;
  if (!result)
    throw new HttpError(503, "QUALITY_UNAVAILABLE", "Capacidad de calidad no disponible.");
  return result;
}
function project(request: Parameters<typeof projectFilter>[0]) {
  const id = projectFilter(request);
  if (!id) throw new HttpError(400, "PROJECT_REQUIRED", "Selecciona un proyecto.");
  return id;
}
router.get("/test-plans", async (request, response) => {
  response.json({ data: await quality(request).listPlans(project(request)) });
});
router.post("/test-plans", async (request, response) => {
  const body = planInput.extend({ projectId: z.string().refine(isId) }).safeParse(request.body);
  if (!body.success)
    throw new HttpError(400, "INVALID_PLAN", "Indica nombre, proyecto y al menos un caso válido.");
  response.status(201).json({
    data: await quality(request).savePlan(
      body.data.projectId,
      null,
      body.data,
      creationContext(request, response),
    ),
  });
});
router.patch("/test-plans/:planId", async (request, response) => {
  const id = parseReference(request.params.planId, "PLAN");
  const body = planInput
    .extend({ projectId: z.string().refine(isId), revision: z.number().int().positive() })
    .safeParse(request.body);
  if (!id || !body.success)
    throw new HttpError(400, "INVALID_PLAN", "Indica plan, proyecto y revisión válidos.");
  response.json({ data: await quality(request).savePlan(body.data.projectId, id, body.data) });
});
router.delete("/test-plans/:planId", async (request, response) => {
  const id = parseReference(request.params.planId, "PLAN");
  if (!id) throw new HttpError(400, "INVALID_PLAN", "Plan inválido.");
  await quality(request).deletePlan(project(request), id);
  response.status(204).end();
});
router.get("/test-cases/:caseId/history", async (request, response) => {
  const id = parseReference(request.params.caseId, "TC");
  if (!id) throw new HttpError(400, "INVALID_CASE", "Caso inválido.");
  response.json({ data: await quality(request).caseHistory(project(request), id) });
});
router.get("/bug-workflow", async (request, response) => {
  response.json({ data: await quality(request).workflow(project(request)) });
});
router.put("/bug-workflow", async (request, response) => {
  const body = workflowInput.safeParse(request.body);
  if (!body.success)
    throw new HttpError(
      400,
      "INVALID_WORKFLOW",
      "Define estados únicos y transiciones entre estados existentes.",
    );
  response.json({ data: await quality(request).saveWorkflow(project(request), body.data) });
});
export default router;
