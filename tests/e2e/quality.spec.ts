import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
test.beforeEach(async ({ page, workspace }) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});
const createdAt = "2026-10-30T12:00:00.000Z";
test("importa CSV con revisión, muestra tipo y filtra por estado documental", async ({
  page,
  workspace,
}) => {
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  const csv =
    "clave;titulo;suite;tipo;estado;precondiciones;accion;resultadoEsperado\nS1;Rechazar inyección;API;Seguridad;Listo;Usuario activo;Enviar entrada;Rechazar\nS1;Rechazar inyección;API;Seguridad;Listo;Usuario activo;Revisar datos;Sin cambios\n";
  await page
    .getByLabel("Archivo Excel o CSV")
    .setInputFiles({ name: "casos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(
    page.getByText("1 registro preparado · 0 registros guardados", { exact: true }),
  ).toBeVisible();
  expect(workspace.writes.filter((w) => w.path === "/test-cases")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(
    page.getByText("1 registro preparado · 1 registro guardado", { exact: true }),
  ).toBeVisible();
  const write = workspace.writes.find((w) => w.path === "/test-cases")!;
  expect(write.body.testType).toBe("Seguridad");
  expect(write.body.lifecycle).toBe("Listo");
  expect(write.body.steps).toHaveLength(2);
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de prueba", exact: true })
    .selectOption("Seguridad");
  await page.getByRole("combobox", { name: "Estado del caso", exact: true }).selectOption("Listo");
  await expect(
    page.locator("tbody").getByText("Rechazar inyección", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("tbody").getByText(workspace.cases[0].title, { exact: true }),
  ).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test("crea plan e inicia ciclo con referencia al plan", async ({ page, workspace }) => {
  let plans: object[] = [];
  await page.route("**/api/test-plans**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      plans = [{ ...body, id: "PLAN-001", revision: 1 }];
      await route.fulfill({ status: 201, json: { data: plans[0] } });
    } else await route.fulfill({ json: { data: plans } });
  });
  await page.route("**/api/test-runs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = route.request().postDataJSON();
    workspace.writes.push({ path: "/test-runs", body });
    const run = {
      id: "RUN-001",
      projectId: "1",
      title: body.title,
      owner: body.owner,
      planId: body.planId,
      caseIds: ["TC-001"],
      caseCount: 1,
      progress: 0,
      status: "En curso",
      createdAt,
      tagIds: [],
      results: [],
    };
    await route.fulfill({ status: 201, json: { data: run } });
  });
  await navigate(page, "Planes y ciclos");
  await page.getByLabel("Nombre", { exact: true }).fill("Release 2");
  await page.getByRole("checkbox", { name: /TC-001/ }).check();
  await page.getByRole("button", { name: "Guardar plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Release 2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar ciclo", exact: true }).click();
  await expect(
    page.getByText("Ejecución RUN-001 creada. Ábrela en Test runs.", { exact: true }),
  ).toBeVisible();
  expect(workspace.writes.find((w) => w.path === "/test-runs")?.body.planId).toBe("PLAN-001");
  await noHorizontalOverflow(page);
});

test("el fallo permite revisar el bug y reejecutar solo fallidos", async ({ page, workspace }) => {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Validación de acceso",
    owner: "QA",
    caseIds: ["TC-001"],
    caseCount: 1,
    status: "En curso",
    progress: 100,
    tagIds: [],
    createdAt,
    results: [
      {
        id: "RES-001",
        caseId: "TC-001",
        caseVersion: 1,
        title: "Validar acceso",
        status: "failed",
        notes: "Se aceptó la entrada inválida",
        executedAt: createdAt,
        steps: [{ action: "Enviar", expectedResult: "Rechazar" }],
      },
    ],
  });
  await page.route("**/api/test-runs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = route.request().postDataJSON();
    workspace.writes.push({ path: "/test-runs", body });
    await route.fulfill({
      status: 201,
      json: {
        data: {
          ...workspace.runs[0],
          id: "RUN-002",
          sourceRunId: "RUN-001",
          progress: 0,
          results: [
            {
              ...workspace.runs[0].results[0],
              id: "RES-002",
              executedAt: null,
              status: "skipped",
              notes: "",
            },
          ],
        },
      },
    });
  });
  await page.reload();
  await navigate(page, "Test runs");
  await page.getByText("Validación de acceso", { exact: true }).click();
  await page.getByRole("button", { name: "Crear bug desde este fallo" }).click();
  await expect(page.getByLabel("Descripción / resultado observado")).toHaveValue(
    "Se aceptó la entrada inválida",
  );
  await page.getByLabel("Entorno", { exact: true }).fill("UAT");
  await page.getByLabel("Versión afectada", { exact: true }).fill("2.0");
  await page.getByRole("button", { name: "Confirmar creación del bug" }).click();
  await expect(
    page.getByText(/creado con caso, ejecución, pasos y evidencia enlazados/),
  ).toBeVisible();
  const bug = workspace.writes.find((w) => w.path === "/bugs")!;
  expect(bug.body.sourceResultId).toBe("RES-001");
  expect(bug.body.environment).toBe("UAT");
  await page.getByRole("button", { name: "Reejecutar solo fallidos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ejecución RUN-002", exact: true })).toBeVisible();
  expect(workspace.writes.find((w) => w.path === "/test-runs")?.body.failedOnly).toBe(true);
  await noHorizontalOverflow(page);
});

test("configura estados y transiciones por proyecto", async ({ page }) => {
  let config = {
    states: ["Abierto", "Resuelto"],
    closedStates: ["Resuelto"],
    transitions: { Abierto: ["Resuelto"], Resuelto: ["Abierto"] },
    revision: 1,
  };
  await page.route("**/api/bug-workflow?*", async (route) => {
    if (route.request().method() === "PUT")
      config = { ...route.request().postDataJSON(), revision: 2 };
    await route.fulfill({ json: { data: config } });
  });
  await navigate(page, "Flujo de bugs");
  await page.getByLabel("Nuevo estado").fill("Triage");
  await page.getByRole("button", { name: "Añadir estado", exact: true }).click();
  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Triage", exact: true }) });
  await article.getByRole("checkbox", { name: "Abierto", exact: true }).check();
  await page.getByRole("button", { name: "Guardar flujo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardar flujo", exact: true })).toBeEnabled();
  expect(config.states).toContain("Triage");
  expect((config.transitions as Record<string, string[]>).Triage).toContain("Abierto");
  await noHorizontalOverflow(page);
});

test("una importación parcial continúa sin duplicar los casos confirmados", async ({
  page,
  workspace,
}) => {
  const requests: { title: string; key: string }[] = [];
  let rejected = false;
  await page.route("**/api/test-cases", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const req = route.request();
    const body = req.postDataJSON();
    requests.push({ title: body.title, key: req.headers()["idempotency-key"] });
    if (body.title === "Segundo" && !rejected) {
      rejected = true;
      await route.fulfill({
        status: 503,
        json: { error: { code: "DATABASE_UNAVAILABLE", message: "No disponible" } },
      });
      return;
    }
    const item = {
      ...body,
      id: body.title === "Primero" ? "TC-002" : "TC-003",
      suite: "",
      status: "Pendiente",
      createdAt,
      tagIds: [],
    };
    workspace.cases.push(item);
    await route.fulfill({ status: 201, json: { data: item } });
  });
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByLabel("Archivo Excel o CSV").setInputFiles({
    name: "casos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "clave;titulo;suite;tipo;estado;precondiciones;accion;resultadoEsperado\n1;Primero;;API;Borrador;;Enviar;Bien\n2;Segundo;;API;Borrador;;Enviar;Bien\n",
    ),
  });
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(page.getByText("No disponible", { exact: true })).toBeVisible();
  await expect(
    page.getByText("2 registros preparados · 1 registro guardado", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(
    page.getByText("2 registros preparados · 2 registros guardados", { exact: true }),
  ).toBeVisible();
  expect(requests.map((r) => r.title)).toEqual(["Primero", "Segundo", "Segundo"]);
  expect(requests[1].key).toBe(requests[2].key);
});

test("cambiar proyecto detiene una importación pendiente en su alcance original", async ({
  page,
  workspace,
}) => {
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
  await page.route("**/api/test-cases?*", (route) => route.fulfill({ json: { data: [] } }));
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  const requested = new Promise<void>((r) => {
    started = r;
  });
  let writes = 0;
  await page.route("**/api/test-cases", async (route) => {
    writes++;
    const body = route.request().postDataJSON();
    expect(body.projectId).toBe("1");
    started();
    await pending;
    await route.fulfill({
      status: 201,
      json: {
        data: { ...body, id: "TC-999", suite: "", status: "Pendiente", createdAt, tagIds: [] },
      },
    });
  });
  await page.reload();
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByLabel("Archivo Excel o CSV").setInputFiles({
    name: "casos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "clave;titulo;suite;tipo;estado;precondiciones;accion;resultadoEsperado\n1;Caso de A;;API;Borrador;;Enviar;Bien\n2;Otro de A;;API;Borrador;;Enviar;Bien\n",
    ),
  });
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await requested;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/test-cases") && r.request().method() === "POST",
  );
  release();
  await response;
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toHaveValue("2");
  await expect(page.getByText("Caso de A", { exact: true })).toHaveCount(0);
  expect(writes).toBe(1);
  expect(workspace.cases.some((c) => c.id === "TC-999")).toBe(false);
});

test("previsualiza un archivo Excel antes de importar", async ({ page, workspace }) => {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Casos");
  sheet.addRow([
    "clave",
    "titulo",
    "suite",
    "tipo",
    "estado",
    "precondiciones",
    "accion",
    "resultadoEsperado",
  ]);
  sheet.addRow(["X1", "Caso Excel", "Pagos", "Regresión", "Listo", "", "Confirmar", "Recibo"]);
  const bytes = await book.xlsx.writeBuffer();
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByLabel("Archivo Excel o CSV").setInputFiles({
    name: "casos.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(bytes),
  });
  await expect(
    page.getByText("1 registro preparado · 0 registros guardados", { exact: true }),
  ).toBeVisible();
  expect(workspace.writes.filter((w) => w.path === "/test-cases")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect(
    page.getByText("1 registro preparado · 1 registro guardado", { exact: true }),
  ).toBeVisible();
  expect(workspace.cases.at(-1)?.testType).toBe("Regresión");
  await noHorizontalOverflow(page);
});
