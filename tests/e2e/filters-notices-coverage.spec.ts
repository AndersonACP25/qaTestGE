import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const stamp = "2026-11-02T03:00:00Z";
function prepareRun(workspace: {
  runs: import("../../backend/src/models/test-run.model").TestRun[];
}) {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Ejecución con historial",
    owner: "QA Local",
    ownerUserId: "1",
    caseIds: ["TC-001"],
    caseCount: 12,
    progress: 0,
    status: "En curso",
    tagIds: [],
    createdAt: stamp,
    results: Array.from({ length: 12 }, (_, i) => ({
      id: `RES-${i + 1}`,
      caseId: `TC-${i + 1}`,
      title: `Caso ${i + 1}`,
      caseVersion: 1,
      status: "skipped",
      notes: "",
      executedAt: null,
      steps: [{ action: "Abrir", expectedResult: "Correcto" }],
    })),
  });
}
test("el acceso a menciones está arriba y el selector usa un chevron SVG", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/mention-notifications?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "NTF-001",
            commentId: "CMT-001",
            target: { kind: "bug", id: "BUG-001" },
            authorName: "Anderson Castillo",
            createdAt: stamp,
            readAt: null,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Notificaciones, 1 sin leer", exact: true }).click();
  const panel = page.getByRole("region", { name: "Notificaciones del proyecto" });
  const link = panel.getByRole("button", { name: "Ver todas las menciones →", exact: true });
  expect((await link.boundingBox())!.y).toBeLessThan(
    (await panel.locator(".notification-bell__item").first().boundingBox())!.y,
  );
  await expect(page.locator(".project-picker__chevron svg")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("notificaciones-arriba.png"),
    animations: "disabled",
  });
  await link.click();
  await expect(page.getByRole("heading", { name: "Mis menciones", exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});
test("Historial de una ejecución larga desplaza solo el cuerpo y mantiene el modal visible", async ({
  page,
  workspace,
}, testInfo) => {
  prepareRun(workspace);
  await page.route("**/api/activity?*", (route) =>
    route.fulfill({
      json: {
        data: Array.from({ length: 15 }, (_, i) => ({
          id: String(i + 1),
          projectId: "1",
          kind: "run",
          resourceId: "RUN-001",
          action: "test_runs.update",
          actorId: "1",
          actorName: `Cambio ${i + 1}`,
          createdAt: stamp,
          requestId: null,
          before: { status: "En curso" },
          after: { status: "Completado" },
        })),
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Ejecución con historial", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    body = dialog.locator(".workspace__dialog-body");
  await expect(dialog.locator(".collaboration__history li")).toHaveCount(15);
  await dialog.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished));
  });
  const before = (await dialog.boundingBox())!;
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole("button", { name: "Historial", exact: true }).click();
    await expect(dialog.locator(".collaboration__history")).toHaveAttribute("open", "");
    await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBeGreaterThan(1000);
    const after = (await dialog.boundingBox())!;
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
    expect(Math.abs(after.height - before.height)).toBeLessThan(2);
    await expect(dialog.locator(".workspace__dialog-heading")).toBeInViewport();
    await expect(dialog.locator(".collaboration__history > summary")).toBeInViewport();
    if (testInfo.project.name === "desktop")
      await expect(dialog.locator(".work-item__properties")).toBeInViewport();
    await dialog.getByRole("button", { name: "Ejecución", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(dialog.locator(".collaboration__history > summary")).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("historial-modal-estable.png"),
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});
test("vincular desde otra página muestra el vínculo confirmado y permite restaurar la matriz", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let linked = false;
  const queries: URLSearchParams[] = [];
  const row = (id: number, bug = false) => ({
    requirementId: `REQ-${String(id).padStart(3, "0")}`,
    code: `R${id}`,
    title: `Requisito ${id}`,
    caseId: "TC-001",
    caseTitle: "Caso de acceso",
    bugId: bug ? "BUG-001" : null,
    bugTitle: bug ? "Bug recién vinculado" : null,
  });
  await page.route("**/api/requirements?*", (route) =>
    route.fulfill({ json: { data: { items: [], total: 0 } } }),
  );
  await page.route("**/api/coverage-links?*", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      requirementId: "REQ-051",
      caseId: "TC-001",
      bugId: "BUG-001",
    });
    linked = true;
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/coverage-matrix?*", (route) => {
    const q = new URL(route.request().url()).searchParams;
    queries.push(q);
    return route.fulfill({
      json: {
        data: {
          rows: q.has("bugId")
            ? [row(51, true)]
            : q.get("offset") === "50"
              ? [row(51, linked)]
              : Array.from({ length: 50 }, (_, i) => row(i + 1)),
          total: q.has("bugId") ? 1 : 51,
          limit: 50,
          offset: Number(q.get("offset")),
        },
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Cobertura y requisitos");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("cell", { name: "R51 · Requisito 51", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vincular bug", exact: true }).click();
  await page.getByRole("button", { name: /^BUG-001 ·/ }).click();
  await expect(page.getByRole("cell", { name: /BUG-001 · Bug recién vinculado/ })).toBeVisible();
  await expect.poll(() => queries.at(-1)?.get("caseId")).toBe("TC-001");
  expect(queries.at(-1)?.get("requirementId")).toBe("REQ-051");
  await expect(page.locator(".coverage__row--updated")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("vinculo-confirmado.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Mostrar matriz completa", exact: true }).click();
  await expect(page.getByRole("cell", { name: "R1 · Requisito 1", exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});
test("buscar casos presenta filas seleccionables y Enter no crea un requisito", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let writes = 0;
  await page.route("**/api/requirements?*", async (route) => {
    if (route.request().method() === "POST") {
      writes++;
      await route.fallback();
    } else {
      await route.fulfill({ json: { data: { items: [], total: 0 } } });
    }
  });
  await page.route("**/api/coverage-matrix?*", (route) =>
    route.fulfill({ json: { data: { rows: [], total: 0, limit: 50, offset: 0 } } }),
  );
  await page.goto("/");
  await navigate(page, "Cobertura y requisitos");
  await page.getByLabel("Código", { exact: true }).fill("LOGIN");
  await page.getByLabel("Título", { exact: true }).fill("Acceso");
  const search = page.getByLabel("Buscar caso para vincular", { exact: true });
  await search.fill("acceso");
  await search.press("Enter");
  await expect(
    page.getByRole("list", { name: "Resultados de casos" }).getByRole("button"),
  ).toHaveCount(1);
  expect(writes).toBe(0);
  const select = page.getByRole("button", { name: /^TC-001 ·/ });
  await select.click();
  await expect(select).toBeDisabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Resultados de casos" })).toContainText(
    "Seleccionado",
  );
  await page.screenshot({
    path: testInfo.outputPath("buscar-caso-vinculo.png"),
    fullPage: true,
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});
test("las confirmaciones flotan sobre el modal, se cierran y reaparecen tras otra acción", async ({
  page,
  workspace,
}, testInfo) => {
  prepareRun(workspace);
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Ejecución con historial", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    result = dialog.locator(".test-run__result").first();
  await result.getByRole("button", { name: "Guardar resultado", exact: true }).click();
  const success = page.locator(".success-alerts__item");
  await expect(success).toContainText("Resultado de TC-1 guardado.");
  expect(
    await page.locator(".success-alerts").evaluate((node) => getComputedStyle(node).position),
  ).toBe("fixed");
  expect(
    Number(await page.locator(".success-alerts").evaluate((node) => getComputedStyle(node).zIndex)),
  ).toBeGreaterThan(40);
  expect((await success.boundingBox())!.y).toBeLessThan(25);
  await success.getByRole("button", { name: "Ocultar confirmación", exact: true }).click();
  await expect(success).toHaveCount(0);
  await result.getByRole("button", { name: "Guardar resultado", exact: true }).click();
  await expect(success).toContainText("Resultado de TC-1 guardado.");
  await page.screenshot({
    path: testInfo.outputPath("confirmacion-global-modal.png"),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
test("los filtros combinan prioridad, responsable y tags y se reinician al navegar", async ({
  page,
  workspace,
}) => {
  workspace.cases.push({
    ...workspace.cases[0],
    id: "TC-002",
    title: "Caso de seguridad",
    testType: "Seguridad",
    lifecycle: "Listo",
    assigneeUserId: "1",
    tagIds: ["1"],
  });
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Run del plan",
    owner: "QA Local",
    ownerUserId: "1",
    planId: "PLAN-001",
    caseIds: ["TC-001"],
    caseCount: 1,
    progress: 0,
    status: "En curso",
    tagIds: ["1"],
    results: [],
    createdAt: stamp,
  });
  await page.route("**/api/tags?*", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "1", projectId: "1", name: "Seguridad", color: "#176a5a", createdAt: stamp }],
      },
    }),
  );
  await page.route("**/api/bugs?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "BUG-001",
            projectId: "1",
            project: "QA",
            title: "Bug prioritario",
            description: "",
            priority: "Alta",
            severity: "Crítica",
            status: "Abierto",
            assignee: "QA Local",
            assigneeUserId: "1",
            tagIds: ["1"],
            createdAt: stamp,
          },
          {
            id: "BUG-002",
            projectId: "1",
            project: "QA",
            title: "Bug secundario",
            description: "",
            priority: "Baja",
            status: "Abierto",
            assignee: null,
            tagIds: [],
            createdAt: stamp,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Bugs");
  const filters = page.getByRole("region", { name: "Filtros de bugs" });
  await filters
    .getByRole("combobox", { name: "Filtrar prioridad", exact: true })
    .selectOption("Alta");
  await filters
    .getByRole("combobox", { name: "Filtrar responsable", exact: true })
    .selectOption("1");
  await filters.getByRole("combobox", { name: "Filtrar por tag", exact: true }).selectOption("1");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Bug prioritario");
  await filters
    .getByRole("combobox", { name: "Filtrar severidad", exact: true })
    .selectOption("Baja");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await filters.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await navigate(page, "Casos de prueba");
  await page
    .getByRole("combobox", { name: "Tipo de prueba", exact: true })
    .selectOption("Seguridad");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await navigate(page, "Test runs");
  await page
    .getByRole("combobox", { name: "Filtrar Test Plan", exact: true })
    .selectOption("Sin plan");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await noHorizontalOverflow(page);
});
test("la Wiki explica las nuevas acciones y las evidencias opcionales", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await navigate(page, "Wiki");
  await page.getByLabel("Buscar en la Wiki", { exact: true }).fill("Evidencias opcionales");
  await expect(
    page.getByRole("heading", { name: "Evidencias opcionales en diseñadores", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".wiki-hub")).toContainText("cerrada inicialmente");
  await page.getByLabel("Buscar en la Wiki", { exact: true }).fill("Mis asignaciones");
  await expect(page.getByRole("heading", { name: "Mis asignaciones", exact: true })).toBeVisible();
});
