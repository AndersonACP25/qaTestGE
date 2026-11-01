import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const date = "2026-10-30T12:00:00Z";
test("Importar está junto a Exportar tabla y las descargas tienen hover sin subrayado", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let tags: object[] = [];
  await page.route("**/api/tags**", async (route) => {
    if (route.request().method() === "POST") {
      tags = [{ ...route.request().postDataJSON(), id: "1", createdAt: date }];
      await route.fulfill({ status: 201, json: { data: tags[0] } });
    } else await route.fulfill({ json: { data: tags } });
  });
  await page.goto("/");
  await navigate(page, "Tags");
  const refresh = page.getByRole("button", { name: "Actualizar", exact: true }),
    importButton = page.getByRole("button", { name: "Importar", exact: true });
  expect(
    await importButton.evaluate((e) =>
      e.parentElement?.classList.contains("workspace-table__toolbar"),
    ),
  ).toBe(true);
  expect(
    await refresh.evaluate((e) =>
      e.parentElement?.classList.contains("workspace__toolbar-actions"),
    ),
  ).toBe(true);
  const refreshColor = await refresh.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await importButton.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(
    refreshColor,
  );
  await importButton.click();
  const link = page.getByRole("link", { name: "Descargar plantilla Excel" });
  expect(await link.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe("none");
  const before = await link.evaluate((e) => getComputedStyle(e).borderColor);
  await link.hover();
  await expect.poll(() => link.evaluate((e) => getComputedStyle(e).borderColor)).not.toBe(before);
  expect(await link.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe("none");
  await page.screenshot({
    path: testInfo.outputPath("importar-tags.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  await page.getByRole("button", { name: "☾ Tema oscuro", exact: true }).click();
  await importButton.click();
  const darkLink = page.getByRole("link", { name: "Descargar guía de importación" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(darkLink).toBeFocused();
  expect(await darkLink.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe("none");
  await darkLink.hover();
  expect(await darkLink.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe("none");
  await page.screenshot({
    path: testInfo.outputPath("importar-tags-oscuro.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Smoke");
  await page.getByRole("button", { name: "Crear tag", exact: true }).click();
  await expect(page.getByText("Tag creado.", { exact: true })).toBeVisible();
  await expect(page.locator(".tags-view__count")).toHaveText("1");
  expect(
    await page.locator(".tags-view__count").evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe("14px");
  if ((page.viewportSize()?.width ?? 0) > 850) {
    const form = await page.locator(".tags-view__form").boundingBox();
    const list = await page.locator(".tags-view__list").boundingBox();
    expect(Math.abs(form!.y - list!.y)).toBeLessThanOrEqual(1);
    expect(form!.x + form!.width).toBeLessThan(list!.x);
  }
  await page.screenshot({
    path: testInfo.outputPath("tags-feedback.png"),
    fullPage: true,
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});

test("Configuración reúne flujo y auditoría con búsqueda y feedback de actualización", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  const events = [
    {
      id: "2",
      projectId: "1",
      kind: "requirement",
      resourceId: "REQ-001",
      action: "requirements.insert",
      actorId: "1",
      actorName: "QA Local",
      createdAt: date,
      requestId: "r2",
      before: null,
      after: { code: "LOGIN", title: "Acceso seguro" },
    },
    {
      id: "1",
      projectId: "1",
      kind: "bug",
      resourceId: "BUG-001",
      action: "bugs.update",
      actorId: "2",
      actorName: "María Dev",
      createdAt: date,
      requestId: "r1",
      before: { status: "Abierto" },
      after: { status: "Resuelto" },
    },
  ];
  await page.route("**/api/activity?*", (route) => route.fulfill({ json: { data: events } }));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Actividad y auditoría", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Flujo de bugs", exact: true })).toHaveCount(0);
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Actividad y auditoría", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Actividad y auditoría del proyecto" }),
  ).toBeVisible();
  await expect(page.locator(".project-activity__event")).toHaveCount(2);
  await page.getByLabel("Buscar en la actividad cargada").fill("REQ-001");
  await expect(page.locator(".project-activity__event")).toHaveCount(1);
  await page.getByText("Ver cambios", { exact: true }).click();
  await expect(page.locator(".project-activity__changes")).toContainText("Acceso seguro");
  await page.getByRole("button", { name: "Actualizar actividad", exact: true }).click();
  await expect(page.getByText("Actividad actualizada.", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("auditoria-configuracion.png"),
    fullPage: true,
  });
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Flujo de bugs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Flujo de bugs del proyecto" })).toBeVisible();
});

test("Solo lectura conserva auditoría en Configuración y no configura el flujo", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "1",
            organizationId: "1",
            name: "Proyecto lectura",
            description: "",
            role: "Solo lectura",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Configuración");
  await expect(page.getByRole("button", { name: "Flujo de bugs", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Actividad y auditoría", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Actividad y auditoría del proyecto" }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
});

test("Aplicar período tiene la altura de los campos y confirma la consulta", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await navigate(page, "Reportes y métricas");
  await expect(page.getByRole("heading", { name: "Resultados del período" })).toBeVisible();
  const apply = page.getByRole("button", { name: "Aplicar período", exact: true });
  const input = page.getByLabel("Hasta", { exact: true });
  expect((await apply.boundingBox())!.height).toBe(44);
  expect(
    Math.abs((await apply.boundingBox())!.height - (await input.boundingBox())!.height),
  ).toBeLessThanOrEqual(6);
  await apply.click();
  await expect(
    page.getByText("Período aplicado. Los indicadores están actualizados.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exportar reporte CSV" }).click();
  await expect(
    page.getByText("Reporte CSV preparado para descargar.", { exact: true }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
});

test("un guardado tardío de tags no muestra feedback en otro proyecto", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", organizationId: "1", name: "Proyecto A", description: "", role: "Admin" },
          { id: "2", organizationId: "1", name: "Proyecto B", description: "", role: "Admin" },
        ],
      },
    }),
  );
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    started = new Promise<void>((r) => {
      requested = r;
    });
  await page.route("**/api/tags", async (route) => {
    const body = route.request().postDataJSON();
    requested();
    await gate;
    await route.fulfill({ status: 201, json: { data: { ...body, id: "1", createdAt: date } } });
  });
  await page.goto("/");
  await navigate(page, "Tags");
  await page.getByLabel("Nombre", { exact: true }).fill("Tag A");
  await page.getByRole("button", { name: "Crear tag", exact: true }).click();
  await started;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/tags") && r.request().method() === "POST",
  );
  release();
  await response;
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("");
  await expect(page.getByText("Tag creado.", { exact: true })).toHaveCount(0);
});
