import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
test("pagina las tablas y exporta solo la página visible", async ({ page, workspace }) => {
  void workspace;
  const bugs = Array.from({ length: 55 }, (_, index) => ({
    id: `BUG-${index + 1}`,
    projectId: "1",
    project: "QA",
    title: `Bug tabla ${index + 1}`,
    description: "",
    priority: "Alta",
    status: "Abierto",
    assignee: null,
    createdAt: "2026-10-29T00:00:00Z",
    tagIds: [],
  }));
  await page.route("**/api/bugs?*", (route) => route.fulfill({ json: { data: bugs } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await navigate(page, "Bugs");
  await expect(page.locator(".workspace-table__table tbody tr")).toHaveCount(50);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator(".workspace-table__table tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Exportar tabla de Bugs", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("5 registros de la página visible");
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Buscar registros" }).fill("Bug tabla 55");
  await expect(page.locator(".workspace-table__table tbody tr")).toHaveCount(1);
  await expect(page.locator(".workspace-table__footer")).toContainText("Página 1 de 1");
  await noHorizontalOverflow(page);
});
test("una creación tardía no contamina otro proyecto", async ({ page, workspace }) => {
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
  await page.route("**/api/bugs?*", (route) => route.fulfill({ json: { data: [] } }));
  let release!: () => void, started!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/bugs", async (route) => {
    started();
    await pending;
    await route.fulfill({
      status: 201,
      json: {
        data: {
          id: "BUG-999",
          projectId: "1",
          project: "Proyecto A",
          title: "Bug exclusivo de A",
          description: "",
          priority: "Media",
          status: "Abierto",
          assignee: null,
          createdAt: "2026-10-29T12:00:00Z",
          tagIds: [],
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await navigate(page, "Diseñar bugs");
  await page.getByLabel("Problema observado").fill("Bug exclusivo de A");
  await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Revisé el contenido y confirmo la creación del bug." })
    .check();
  await page.getByRole("button", { name: "Guardar bug en el proyecto" }).click();
  await requested;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  await expect(
    page.getByText("Prepara un bug o abre un borrador para editarlo.", { exact: true }),
  ).toBeVisible();
  const response = page.waitForResponse(
    (item) => item.url().endsWith("/api/bugs") && item.request().method() === "POST",
  );
  release();
  await response;
  await navigate(page, "Bugs");
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toHaveValue("2");
  await expect(page.getByText("Bug exclusivo de A", { exact: true })).toHaveCount(0);
  await expect(page.locator(".workspace-table__footer")).toContainText("0 resultados");
});
test("los tipos incluidos se editan y eliminan desde su fila", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Diseño de casos", exact: true }).click();
  await page.getByRole("button", { name: "Editar tipo Smoke", exact: true }).click();
  await expect(page.getByLabel("Nombre del tipo", { exact: true })).toBeFocused();
  await page.getByLabel("Nombre del tipo", { exact: true }).fill("Smoke editado");
  await page.getByRole("button", { name: "Guardar tipo de caso", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Editar tipo Smoke editado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eliminar tipo Smoke editado", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Editar tipo Smoke editado", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await navigate(page, "Diseñar test cases");
  await expect(page.getByText("Smoke editado", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Smoke", { exact: true })).toHaveCount(0);
  await navigate(page, "Bugs");
  const tab = page.getByRole("button", { name: "Todos", exact: true });
  await expect(tab).toHaveCSS("font-size", "14px");
  await expect(page.getByRole("textbox", { name: "Buscar registros" })).toHaveCSS(
    "font-size",
    "14px",
  );
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("filtros-ampliados.png"), fullPage: true });
});
test("un contrato inválido muestra un error recuperable", async ({ page, workspace }) => {
  void workspace;
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: "incorrecto" } }));
  await page.goto("/");
  await expect(
    page.getByText("La API devolvió datos con un formato inesperado. Inténtalo de nuevo.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();
});
