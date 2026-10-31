import { test, expect, navigate, noHorizontalOverflow } from "./fixture";

test("los contadores y la exportación concuerdan con un registro", async ({ page, workspace }) => {
  void workspace;
  await page.route("**/api/bugs?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "BUG-1",
            projectId: "1",
            project: "QA",
            title: "Bug resuelto",
            description: "",
            priority: "Alta",
            status: "Resuelto",
            assignee: null,
            createdAt: "2026-10-29T00:00:00Z",
            tagIds: [],
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await navigate(page, "Reportes y métricas");
  await expect(page.getByRole("heading", { name: "Resultados del período" })).toBeVisible();
  await expect(page.getByText("Registrados", { exact: true })).toBeVisible();
  await navigate(page, "Bugs");
  await expect(page.locator(".workspace-table__footer")).toContainText("1 resultado ·");
  await page.getByRole("button", { name: "Exportar tabla de Bugs", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Se exportará 1 registro de la página visible",
  );
});

test("el perfil abre Configuración con teclado y cierra el menú móvil", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
  if (await menu.isVisible()) await menu.click();
  const profile = page.getByRole("button", {
    name: "Abrir configuración de QA Local",
    exact: true,
  });
  await profile.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("QA Local");
  await expect(page.locator(".workspace__menu-toggle")).toHaveAttribute("aria-expanded", "false");
  await noHorizontalOverflow(page);
});

test("acciones y encabezados comparten una escala legible en ambos temas", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.getByRole("button", { name: /Tema (claro|oscuro)/ }).click();
    for (const [section, action] of [
      ["Bugs", "Nuevo bug"],
      ["Casos de prueba", "Nuevo caso de prueba"],
      ["Test runs", "Nueva ejecución"],
    ]) {
      await navigate(page, section);
      const create = page.getByRole("button", { name: action, exact: true });
      await expect(create).toHaveCSS("font-size", "16px");
      expect((await create.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const title = page.getByRole("heading", { name: section, exact: true }).first();
      const font = await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(font).toBeGreaterThanOrEqual(24);
      await noHorizontalOverflow(page);
    }
    await page.screenshot({ path: testInfo.outputPath(`tipografia-${theme}.png`), fullPage: true });
  }
});
