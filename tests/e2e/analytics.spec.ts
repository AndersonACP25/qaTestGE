import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
import type { RunReport } from "../../src/contracts/analyticsContracts";
const stamp = "2026-10-30T12:00:00Z";
test("Dashboard y Reportes usan agregados sin snapshots completos", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/analytics?*", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        data: {
          range: { from: url.searchParams.get("from"), to: url.searchParams.get("to") },
          historySince: stamp,
          generatedAt: stamp,
          summary: {
            bugs: 5,
            openBugs: 3,
            closedBugs: 2,
            cases: 4,
            activeCases: 4,
            runs: 2,
            activeRuns: 1,
            completedRuns: 1,
            evidence: 2,
            recorded: 4,
            passed: 3,
            failed: 1,
            blocked: 0,
            skipped: 0,
            approvalRate: 75,
            requirements: 3,
            coveredRequirements: 2,
          },
          runTrend: [
            {
              id: "RUN-001",
              title: "Primer ciclo",
              createdAt: "2026-10-29T12:00:00Z",
              recorded: 2,
              evaluated: 2,
              passed: 1,
              failed: 1,
              approvalRate: 50,
            },
            {
              id: "RUN-002",
              title: "Segundo ciclo",
              createdAt: stamp,
              recorded: 2,
              evaluated: 2,
              passed: 2,
              failed: 0,
              approvalRate: 100,
            },
          ],
          bugTrend: [
            { date: "2026-10-29", open: 4, closed: 1 },
            { date: "2026-10-30", open: 3, closed: 2 },
          ],
          frequentFailures: [
            { caseId: "TC-001", title: "Validar acceso", failures: 1, executions: 2 },
          ],
          typeCoverage: [{ type: "Funcional", total: 4, executed: 2 }],
        },
      },
    });
  });
  const reads: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (["/api/bugs", "/api/test-cases", "/api/test-runs", "/api/evidence"].includes(u.pathname))
      reads.push(u.pathname);
  });
  await page.goto("/");
  await expect(page.getByText("Bugs abiertos", { exact: true })).toBeVisible();
  await expect(page.locator("main table")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /Estado actual de bugs|abiertos, .*cerrados/ }),
  ).toBeVisible();
  await expect(page.locator(".analytics__chart circle").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard-graficos.png"), fullPage: true });
  await navigate(page, "Reportes y métricas");
  await expect(
    page.getByRole("heading", { name: "Casos que fallan con frecuencia" }),
  ).toBeVisible();
  await page.getByLabel("Desde", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-10-30");
  const response = page.waitForResponse(
    (r) => r.url().includes("/api/analytics?") && r.url().includes("from=2026-09-01"),
  );
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await response;
  expect(reads).toEqual([]);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("reportes-graficos.png"), fullPage: true });
});

test("importa bugs Excel tras revisar y continúa con la misma clave tras fallo", async ({
  page,
  workspace,
}) => {
  void workspace;
  const requests: { body: unknown; key: string | undefined }[] = [];
  await page.route("**/api/bugs", async (route) => {
    const r = route.request(),
      body = r.postDataJSON();
    requests.push({ body, key: r.headers()["idempotency-key"] });
    if (requests.length === 1) {
      await route.fulfill({ status: 503, json: { error: { message: "Fallo temporal" } } });
      return;
    }
    await route.fulfill({
      status: 201,
      json: {
        data: {
          ...body,
          id: "BUG-099",
          project: "QA",
          status: "Abierto",
          assignee: null,
          createdAt: stamp,
          tagIds: [],
        },
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook();
  w.addWorksheet("Guía").addRow(["No importar"]);
  const s = w.addWorksheet("Bugs");
  s.addRow(["titulo", "descripcion", "prioridad", "severidad", "entorno", "version"]);
  s.addRow(["Error Excel", "Resultado observado", "Alta", "Crítica", "QA", "v2"]);
  await page.getByLabel("Archivo Excel o CSV").setInputFiles({
    name: "bugs.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await w.xlsx.writeBuffer()),
  });
  await expect(page.getByText("Error Excel · Alta · Crítica", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(page.getByText("Fallo temporal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(
    page.getByText("1 registro preparado · 1 registro guardado", { exact: true }),
  ).toBeVisible();
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0].body).toMatchObject({
    projectId: "1",
    severity: "Crítica",
    environment: "QA",
    affectedVersion: "v2",
  });
});

test("importa tags y descarga la plantilla con su guía", async ({ page, workspace }) => {
  void workspace;
  let payload: unknown;
  await page.route("**/api/imports/tags?*", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { data: { created: 1, existing: 0 } } });
  });
  await page.goto("/");
  await navigate(page, "Tags");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  const template = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar plantilla Excel" }).click();
  expect((await template).suggestedFilename()).toBe("plantilla-qaTestGE.xlsx");
  const guide = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar guía de importación" }).click();
  expect((await guide).suggestedFilename()).toBe("guia-importacion.md");
  await page.getByLabel("Archivo Excel o CSV").setInputFiles({
    name: "tags.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("nombre;color\nRegresión;#7462DF\n"),
  });
  expect(payload).toBeUndefined();
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(page.getByText("1 tag creado · 0 tags existentes", { exact: true })).toBeVisible();
  expect(payload).toEqual({ rows: [{ name: "Regresión", color: "#7462DF" }] });
  await noHorizontalOverflow(page);
});

test("gestiona requisitos y muestra vínculos en una matriz paginada", async ({
  page,
  workspace,
}) => {
  void workspace;
  let saved: Record<string, unknown> | undefined;
  let linked = false;
  await page.route("**/api/coverage-links?*", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      requirementId: "REQ-001",
      caseId: "TC-001",
      bugId: "BUG-001",
    });
    linked = true;
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/requirements**", async (route) => {
    if (route.request().method() === "POST") {
      saved = { ...route.request().postDataJSON(), id: "REQ-001", version: 1, createdAt: stamp };
      await route.fulfill({ status: 201, json: { data: saved } });
    } else
      await route.fulfill({
        json: { data: { items: saved ? [saved] : [], total: saved ? 1 : 0 } },
      });
  });
  await page.route("**/api/coverage-matrix?*", (route) =>
    route.fulfill({
      json: {
        data: {
          rows: saved
            ? [
                {
                  requirementId: "REQ-001",
                  code: "LOGIN",
                  title: "Acceso seguro",
                  caseId: "TC-001",
                  caseTitle: "Validar acceso",
                  bugId: linked ? "BUG-001" : null,
                  bugTitle: linked ? "Error vinculado" : null,
                },
              ]
            : [],
          total: saved ? 1 : 0,
          limit: 50,
          offset: 0,
        },
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Cobertura y requisitos");
  await page.getByLabel("Código", { exact: true }).fill("LOGIN");
  await page.getByLabel("Título", { exact: true }).fill("Acceso seguro");
  await page.getByRole("button", { name: /^TC-001 ·/ }).click();
  await page.getByRole("button", { name: "Guardar requisito" }).click();
  await expect(
    page.getByRole("cell", { name: "LOGIN · Acceso seguro", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Requisito creado.", { exact: true })).toBeVisible();
  expect(saved?.caseIds).toEqual(["TC-001"]);
  await expect(page.getByRole("cell", { name: /Sin bug vinculado/ })).toBeVisible();
  await page.getByRole("button", { name: "Vincular bug", exact: true }).click();
  await page.getByRole("button", { name: /^BUG-001 ·/ }).click();
  await expect(page.getByRole("cell", { name: /BUG-001 · Error vinculado/ })).toBeVisible();
  await expect(
    page.getByText("Bug vinculado al caso del requisito.", { exact: true }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
});

test("exporta PDF con snapshot de ejecución y referencias de evidencia", async ({
  page,
  workspace,
}, testInfo) => {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Validación de acceso",
    owner: "QA",
    status: "En curso",
    caseIds: ["TC-001"],
    caseCount: 1,
    progress: 100,
    createdAt: stamp,
    tagIds: [],
    results: [
      {
        id: "RES-001",
        caseId: "TC-001",
        title: "Caso histórico",
        caseVersion: 1,
        status: "failed",
        notes: "Error observado",
        executedAt: stamp,
        steps: [{ action: "Enviar", expectedResult: "Denegar" }],
      },
    ],
  });
  const report: RunReport = {
    projectName: "Proyecto QA",
    generatedAt: stamp,
    runId: "RUN-001",
    title: "Validación de acceso",
    owner: "QA",
    status: "En curso",
    createdAt: stamp,
    summary: {
      total: 1,
      recorded: 1,
      passed: 0,
      failed: 1,
      blocked: 0,
      skipped: 0,
      approvalRate: 0,
    },
    results: [
      {
        id: "RES-001",
        caseId: "TC-001",
        title: "Caso histórico",
        caseVersion: 1,
        status: "failed",
        notes: "Error observado",
        executedAt: stamp,
        steps: [{ action: "Enviar", expectedResult: "Denegar" }],
        bugIds: ["BUG-001"],
        evidence: [{ id: "EVD-001", name: "captura.png" }],
      },
    ],
  };
  await page.route("**/api/test-runs/RUN-001/report?*", (route) =>
    route.fulfill({ json: { data: report } }),
  );
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByText("Validación de acceso", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar informe PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("informe-RUN-001.pdf");
  await file.saveAs(testInfo.outputPath("informe-RUN-001.pdf"));
});

test("una respuesta tardía de analítica no aparece en otro proyecto", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", organizationId: "1", role: "Admin", name: "Proyecto A", description: "" },
          { id: "2", organizationId: "1", role: "Admin", name: "Proyecto B", description: "" },
        ],
      },
    }),
  );
  let release!: () => void;
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/analytics?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("projectId") === "1") {
      requested();
      await gate;
      await route.fulfill({ status: 503, json: { error: { message: "Error tardío de A" } } });
    } else await route.fulfill({ status: 503, json: { error: { message: "Sin datos de B" } } });
  });
  await page.goto("/");
  await started;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  await expect(page.getByText("Sin datos de B", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("Error tardío de A", { exact: true })).toHaveCount(0);
});

test("un fallo del listado no bloquea la analítica independiente", async ({ page, workspace }) => {
  void workspace;
  await page.route("**/api/bugs?*", (route) =>
    route.fulfill({ status: 503, json: { error: { message: "Listado no disponible" } } }),
  );
  await page.goto("/");
  await navigate(page, "Bugs");
  await expect(page.getByText("Listado no disponible", { exact: true })).toBeVisible();
  await navigate(page, "Dashboard");
  await expect(page.getByText("Bugs abiertos", { exact: true })).toBeVisible();
  await expect(page.getByText("Listado no disponible", { exact: true })).toHaveCount(0);
  await navigate(page, "Reportes y métricas");
  await expect(page.getByRole("heading", { name: "Resultados del período" })).toBeVisible();
});
