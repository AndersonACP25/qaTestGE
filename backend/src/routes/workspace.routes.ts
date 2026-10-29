import { Router } from "express";
import type { AuthProvider } from "../models/user.model.js";
import { HttpError } from "../http-error.js";
import { isId, isRecord, text } from "../validation.js";
export function workspaceRouter(auth: AuthProvider) {
  const router = Router();
  router.get("/projects", async (_request, response) => {
    response.json({ data: await response.locals.repository.listProjects() });
  });
  function projectInput(body: unknown) {
    if (
      !isRecord(body) ||
      !text(body.name, 100) ||
      typeof body.description !== "string" ||
      body.description.length > 5000
    )
      throw new HttpError(400, "INVALID_PROJECT", "Introduce un nombre y una descripción válidos.");
    return { name: body.name, description: body.description };
  }
  router.post("/projects", async (request, response) => {
    const input = projectInput(request.body);
    if (request.body.teamId !== undefined && !isId(request.body.teamId))
      throw new HttpError(400, "INVALID_PROJECT", "Equipo inválido.");
    response.status(201).json({
      data: await auth.createProject(
        response.locals.user.id,
        input.name,
        input.description,
        request.body.teamId,
      ),
    });
  });
  router.patch("/projects/:projectId", async (request, response) => {
    if (!isId(request.params.projectId))
      throw new HttpError(400, "INVALID_PROJECT", "Identificador de proyecto inválido.");
    const input = projectInput(request.body);
    response.json({
      data: await auth.updateProject(
        response.locals.user.id,
        request.params.projectId,
        input.name,
        input.description,
      ),
    });
  });
  router.delete("/projects/:projectId", async (request, response) => {
    if (!isId(request.params.projectId))
      throw new HttpError(400, "INVALID_PROJECT", "Identificador de proyecto inválido.");
    await auth.deleteProject(response.locals.user.id, request.params.projectId);
    response.status(204).end();
  });
  router.get("/teams", async (_request, response) => {
    response.json({ data: await auth.listTeams(response.locals.user.id) });
  });
  router.post("/teams", async (request, response) => {
    if (!isRecord(request.body) || !text(request.body.name, 100))
      throw new HttpError(400, "INVALID_TEAM", "Introduce un nombre válido.");
    response
      .status(201)
      .json({ data: await auth.createTeam(response.locals.user.id, request.body.name) });
  });
  router.patch("/teams/:teamId", async (request, response) => {
    if (!isId(request.params.teamId) || !isRecord(request.body) || !text(request.body.name, 100))
      throw new HttpError(400, "INVALID_TEAM", "Revisa el nombre y el equipo.");
    await auth.updateTeam(response.locals.user.id, request.params.teamId, request.body.name);
    response.status(204).end();
  });
  router.delete("/teams/:teamId", async (request, response) => {
    if (!isId(request.params.teamId))
      throw new HttpError(400, "INVALID_TEAM", "Identificador de equipo inválido.");
    await auth.deleteTeam(response.locals.user.id, request.params.teamId);
    response.status(204).end();
  });
  router.get("/teams/:teamId/members", async (request, response) => {
    if (!isId(request.params.teamId))
      throw new HttpError(400, "INVALID_TEAM", "Identificador de equipo inválido.");
    response.json({
      data: await auth.listTeamMembers(response.locals.user.id, request.params.teamId),
    });
  });
  router.post("/teams/:teamId/invitations", async (request, response) => {
    if (!isId(request.params.teamId))
      throw new HttpError(400, "INVALID_TEAM", "Identificador de equipo inválido.");
    response
      .status(201)
      .json({ data: await auth.createTeamInvite(response.locals.user.id, request.params.teamId) });
  });
  router.post("/team-invitations/accept", async (request, response) => {
    if (
      !isRecord(request.body) ||
      typeof request.body.code !== "string" ||
      !/^[a-f0-9]{64}$/.test(request.body.code)
    )
      throw new HttpError(400, "INVALID_INVITE", "El código de invitación no es válido.");
    await auth.acceptTeamInvite(response.locals.user.id, request.body.code);
    response.status(204).end();
  });
  router.delete("/teams/:teamId/members/:memberId", async (request, response) => {
    if (!isId(request.params.teamId) || !isId(request.params.memberId))
      throw new HttpError(400, "INVALID_TEAM", "Identificadores inválidos.");
    await auth.removeTeamMember(
      response.locals.user.id,
      request.params.teamId,
      request.params.memberId,
    );
    response.status(204).end();
  });

  return router;
}
