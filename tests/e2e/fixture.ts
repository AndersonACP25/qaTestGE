import { test as base, expect, type Page } from "@playwright/test";
import type { TestCase } from "../../backend/src/models/test-case.model";
import type { TestRun } from "../../backend/src/models/test-run.model";

export const test = base.extend<{
  workspace: {
    cases: TestCase[];
    runs: TestRun[];
    writes: { path: string; body: Record<string, unknown> }[];
  };
}>({
  workspace: async ({ page }, use) => {
    const createdAt = "2026-10-23T12:00:00.000Z";
    const state = {
      projects: [
        {
          id: "1",
          organizationId: "1",
          name: "Proyecto QA con nombre largo para comprobar responsive",
          description: "",
        },
      ],
      cases: [
        {
          id: "TC-001",
          projectId: "1",
          title: "Validar acceso con un nombre de usuario extenso",
          suite: "Smoke",
          preconditions: "Sesión válida",
          status: "Pendiente",
          steps: [
            { action: "Abrir", expectedResult: "Se muestra" },
            { action: "Continuar", expectedResult: "Se confirma" },
          ],
          createdAt,
          tagIds: [],
        },
      ] as TestCase[],
      runs: [] as TestRun[],
      writes: [] as { path: string; body: Record<string, unknown> }[],
    };
    await page.route("**/*", (route) =>
      route.request().url().startsWith("http://127.0.0.1:4174/") ? route.continue() : route.abort(),
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace("/api", "");
      const method = req.method();
      const body = method === "GET" ? {} : (req.postDataJSON() ?? {});
      if (method !== "GET") state.writes.push({ path, body });
      let data: unknown = [];
      let status = 200;
      if (path === "/auth/me")
        data = {
          user: { id: "1", name: "QA Local", email: "qa@example.test" },
          csrfToken: "test-csrf",
        };
      else if (path === "/teams" && method === "GET")
        data = [{ id: "1", name: "Equipo QA", role: "owner" }];
      else if (path === "/teams/1/members" && method === "GET")
        data = [{ id: "1", name: "QA Local", role: "owner" }];
      else if (path === "/teams/1/invitations" && method === "POST") {
        data = { code: "a".repeat(64), expiresAt: "2030-01-01T00:00:00.000Z" };
        status = 201;
      } else if (path === "/team-invitations/accept" && method === "POST") {
        await route.fulfill({ status: 204 });
        return;
      } else if (path === "/projects" && method === "GET") data = state.projects;
      else if (path === "/projects" && method === "POST") {
        data = { id: "2", organizationId: "1", name: body.name, description: body.description };
        state.projects.push(data as (typeof state.projects)[number]);
        status = 201;
      } else if (path === "/projects/2" && method === "PATCH") {
        const project = state.projects.find((item) => item.id === "2")!;
        Object.assign(project, body);
        data = project;
      } else if (path === "/projects/2" && method === "DELETE") {
        state.projects = state.projects.filter((item) => item.id !== "2");
        await route.fulfill({ status: 204 });
        return;
      } else if (path === "/bugs" && method === "GET")
        data = [
          {
            id: "BUG-001",
            projectId: "1",
            title: "Validar el formulario con un título largo y referencias explícitas",
            project: "Proyecto QA",
            description: "",
            priority: "Alta",
            status: "Abierto",
            assignee: "Responsable con nombre extenso",
            createdAt,
            tagIds: [],
          },
        ];
      else if (path === "/evidence" && method === "GET")
        data = [
          {
            id: "EVD-001",
            projectId: "1",
            name: "captura-de-validacion-con-nombre-largo.png",
            type: "Imagen",
            related: ["TC-001"],
            sizeBytes: 1024,
            hasFile: true,
            createdAt,
          },
        ];
      else if (path === "/test-cases" && method === "GET") data = state.cases;
      else if (path === "/test-cases" && method === "POST") {
        data = {
          ...body,
          id: `TC-${String(state.cases.length + 1).padStart(3, "0")}`,
          status: "Pendiente",
          createdAt,
          tagIds: [],
        };
        state.cases.push(data as TestCase);
        status = 201;
      } else if (/^\/test-cases\/TC-\d+$/.test(path) && method === "PATCH") {
        const item = state.cases.find((item) => path.endsWith(item.id))!;
        Object.assign(item, body);
        data = item;
      } else if (path === "/test-runs" && method === "GET") data = state.runs;
      else if (path === "/test-runs" && method === "POST") {
        const selected = state.cases.filter((item) => body.caseIds.includes(item.id));
        data = {
          ...body,
          id: "RUN-001",
          createdAt,
          status: "En curso",
          caseCount: selected.length,
          progress: 0,
          results: selected.map((item, index) => ({
            id: `RES-${String(index + 1).padStart(3, "0")}`,
            caseId: item.id,
            title: item.title,
            status: "skipped",
            notes: "",
            executedAt: null,
            steps: item.steps,
          })),
        };
        state.runs.push(data as TestRun);
        status = 201;
      } else if (path.startsWith("/test-runs/RUN-") && method === "PATCH") {
        const run = state.runs[0];
        if (path.includes("/results/")) {
          const result = run.results.find((item) => path.endsWith(item.id))!;
          Object.assign(result, body, { executedAt: createdAt });
          run.progress = Math.round(
            (run.results.filter((item) => item.executedAt).length / run.results.length) * 100,
          );
        } else {
          if (body.status === "Completado" && run.progress < 100) {
            await route.fulfill({
              status: 409,
              json: {
                error: { code: "RUN_INCOMPLETE", message: "Registra un resultado para cada caso." },
              },
            });
            return;
          }
          Object.assign(run, body);
        }
        data = run;
      } else if (path.startsWith("/test-runs/RUN-") && method === "DELETE") {
        state.runs.length = 0;
        await route.fulfill({ status: 204 });
        return;
      } else if (method !== "GET") {
        await route.fulfill({
          status: 500,
          json: { error: { message: `Petición inesperada: ${method} ${path}` } },
        });
        return;
      }
      await route.fulfill({ status, json: { data } });
    });
    await use(state);
  },
});
export { expect };

export async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Abrir menú" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: new RegExp(`^${name}(?: \\d+)?$`) }).click();
}
export async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
  const widths = await page
    .locator(".workspace-table__scroll")
    .evaluateAll((elements) => elements.map((el) => el.scrollWidth - el.clientWidth));
  expect(widths.every((width) => width <= 1)).toBe(true);
}
