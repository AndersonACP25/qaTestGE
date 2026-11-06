import { test, expect, navigate, noHorizontalOverflow } from "./fixture";

const createdAt = "2026-01-01T00:00:00Z";

for (const kind of ["requirement", "bug"] as const) {
  test(`diseña casos desde un ${kind} y conserva el vínculo al guardar`, async ({
    page,
    workspace,
  }) => {
    const id = kind === "requirement" ? "REQ-001" : "BUG-001";
    await page.route("**/api/ai/settings", (route) =>
      route.fulfill({
        json: { data: { source: "environment", revision: null, visualAvailable: true } },
      }),
    );
    if (kind === "requirement") {
      await page.route("**/api/requirements?*", (route) =>
        route.fulfill({
          json: {
            data: {
              total: 1,
              items: [
                {
                  id,
                  projectId: "1",
                  code: "ACC",
                  title: "Requisito de acceso",
                  description: "Requiere autenticación.",
                  version: 1,
                  createdAt,
                  caseIds: [],
                },
              ],
            },
          },
        }),
      );
      await page.route("**/api/coverage-matrix?*", (route) =>
        route.fulfill({ json: { data: { total: 0, rows: [], limit: 50, offset: 0 } } }),
      );
    }
    await page.route("**/api/ai/case-proposals", async (route) => {
      const body = route.request().postDataJSON();
      expect(body.description).toBe("Texto revisado para Gemini.");
      expect(body).not.toHaveProperty("source");
      await route.fulfill({
        json: {
          data: [
            {
              categoryIndex: 0,
              title: "Prueba de acceso",
              steps: [{ action: "Abre el formulario", expected: "Se muestra el acceso" }],
            },
          ],
        },
      });
    });
    await page.goto("/");
    if (kind === "requirement") await navigate(page, "Cobertura y requisitos");
    else {
      await navigate(page, "Bugs");
      await page
        .getByText("Validar el formulario con un título largo y referencias explícitas", {
          exact: true,
        })
        .click();
    }
    await page.getByRole("button", { name: "Diseñar casos con Gemini" }).click();
    await expect(page.getByText(new RegExp(`Origen · ${id}`))).toBeVisible();
    const description = page.getByLabel("Descripción o requisito", { exact: true });
    await expect(description).not.toHaveValue("");
    await description.fill("Texto revisado para Gemini.");
    await page.getByRole("button", { name: "Proponer con Gemini" }).click();
    const consent = page.getByRole("dialog", { name: "Enviar texto a Gemini" });
    await expect(consent.getByText("Texto revisado para Gemini.")).toBeVisible();
    await consent.getByRole("button", { name: "Enviar y generar propuesta" }).click();
    await expect(page.getByLabel("Título del caso", { exact: true })).toHaveValue(
      "Prueba de acceso",
    );
    expect(workspace.writes.filter(({ path }) => path === "/test-cases")).toHaveLength(0);
    await page.getByRole("button", { name: "Guardar en casos de prueba" }).click();
    await expect
      .poll(() => workspace.writes.find(({ path }) => path === "/test-cases")?.body.source)
      .toEqual({ kind, id });
    await page.getByRole("button", { name: "Limpiar ventana", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar limpieza", exact: true }).click();
    await expect(page.getByText(new RegExp(`Origen · ${id}`))).toHaveCount(0);
    await expect(page.getByLabel("Descripción o requisito", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Título del caso", { exact: true })).toHaveCount(0);
    expect(workspace.cases.some(({ title }) => title === "Prueba de acceso")).toBe(true);
    await noHorizontalOverflow(page);
  });
}

test("resume una ejecución con cifras verificadas y texto editable", async ({
  page,
  workspace,
}) => {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Regresión de acceso",
    owner: "QA",
    caseIds: ["TC-001"],
    caseCount: 1,
    progress: 100,
    status: "Completado",
    createdAt,
    tagIds: [],
    results: [
      {
        id: "RES-001",
        caseId: "TC-001",
        title: "Acceso",
        status: "failed",
        executedAt: createdAt,
        notes: "Nota privada",
        steps: [],
      },
    ],
  });
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: { data: { source: "environment", revision: null, visualAvailable: true } },
    }),
  );
  const context = {
    counts: { passed: 0, failed: 1, blocked: 0, skipped: 0, pending: 0 },
    findings: [{ caseId: "TC-001", title: "Acceso", status: "failed" }],
  };
  let sent = false;
  await page.route("**/api/ai/run-summary**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { data: context } });
      return;
    }
    sent = true;
    expect(route.request().postDataJSON()).toEqual({
      projectId: "1",
      runId: "RUN-001",
      consent: true,
      context,
    });
    await route.fulfill({ json: { data: { summary: "Revisar el fallo de acceso." } } });
  });
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Regresión de acceso", exact: true }).click();
  await page.getByRole("button", { name: "Resumir ejecución con Gemini" }).click();
  const consent = page.getByRole("dialog", { name: "Enviar texto a Gemini" });
  await expect(consent.getByText("TC-001 · Fallido · Acceso")).toBeVisible();
  expect(sent).toBe(false);
  await consent.getByRole("button", { name: "Enviar y generar propuesta" }).click();
  const summary = page.getByLabel("Resumen editable");
  await expect(summary).toHaveValue("Revisar el fallo de acceso.");
  await summary.fill("Texto revisado por QA.");
  await expect(
    page.getByRole("region", { name: "Cifras de la ejecución" }).getByText("1 fallido"),
  ).toBeVisible();
  expect(workspace.writes.filter(({ path }) => path.startsWith("/test-runs"))).toHaveLength(0);
  await noHorizontalOverflow(page);
});
