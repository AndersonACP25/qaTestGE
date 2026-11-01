import { test, expect, navigate, noHorizontalOverflow } from "./fixture";

test("Diseñar bugs conserva borradores y solo crea tras revisión", async ({
  page,
  workspace,
}, testInfo) => {
  await page.route("**/api/auth/bug-templates", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "template-1",
            name: "Error funcional",
            title: "[BUG]",
            description: "## Pasos para reproducir",
            priority: "Alta",
            createdAt: "hoy",
          },
        ],
      },
    }),
  );
  await page.route("**/api/tags?*", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "tag-1", projectId: "1", name: "Smoke demo", color: "#16754b", createdAt: "hoy" },
        ],
      },
    }),
  );
  await page.reload();
  await navigate(page, "Diseñar bugs");
  await page.getByLabel("Problema observado").fill("El formulario no permite entrar");
  await page.getByLabel("Plantilla de bug").selectOption("template-1");
  await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
  await expect(page.getByLabel("Título del bug")).toHaveValue(
    "[BUG] El formulario no permite entrar",
  );
  await page.getByLabel("Título del bug").fill("Error de acceso revisado");
  await page.getByRole("checkbox", { name: "Smoke demo", exact: true }).check();
  await expect(page.getByRole("button", { name: "Guardar en Bugs" })).toBeEnabled();
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  expect(workspace.writes.filter((item) => item.path === "/bugs")).toHaveLength(0);
  await page.reload();
  await navigate(page, "Diseñar bugs");
  await page.getByRole("button", { name: "Abrir borrador", exact: true }).click();
  await expect(page.getByLabel("Título del bug")).toHaveValue("Error de acceso revisado");
  await expect(page.getByRole("checkbox", { name: "Smoke demo", exact: true })).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Revisé el contenido y confirmo la creación del bug." })
    .check();
  await page.getByRole("button", { name: "Guardar en Bugs" }).click();
  await expect(page.getByText("Bug BUG-002 guardado en Bugs.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar en Bugs" })).toBeDisabled();
  const writes = workspace.writes.filter((item) => item.path === "/bugs");
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toMatchObject({
    projectId: "1",
    title: "Error de acceso revisado",
    priority: "Alta",
    tagIds: ["tag-1"],
  });
  await expect(page.getByText("No hay borradores guardados.", { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("disenar-bugs.png"), fullPage: true });
});

test("edita y elimina tipos personalizados conservando sus preferencias", async ({ page }) => {
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Diseño de casos", exact: true }).click();
  await page.getByLabel("Nombre del nuevo tipo").fill("Contratos locales");
  await page.getByRole("button", { name: "Añadir tipo de caso", exact: true }).click();
  await page.getByRole("checkbox", { name: "Contratos locales", exact: true }).check();
  await page.getByLabel("Valor inicial para Contratos locales").selectOption("4");
  await page.getByRole("button", { name: "Guardar valores predeterminados" }).click();
  await page.getByRole("button", { name: "Editar tipo Contratos locales", exact: true }).click();
  await page.getByLabel("Nombre del tipo", { exact: true }).fill("Contratos revisados");
  await page.getByRole("button", { name: "Guardar tipo de caso", exact: true }).click();
  await page.reload();
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Diseño de casos", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Contratos revisados", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Valor inicial para Contratos revisados")).toHaveValue("4");
  await page
    .getByRole("button", { name: "Eliminar tipo Contratos revisados", exact: true })
    .click();
  await page.reload();
  await navigate(page, "Diseñar test cases");
  await expect(page.getByText("Contratos revisados", { exact: true })).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test.beforeEach(async ({ page, workspace }) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

test("Dashboard y listados sin desbordamiento en ambos temas", async ({ page }, testInfo) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    for (const name of [
      "Dashboard",
      "Reportes y métricas",
      "Bugs",
      "Casos de prueba",
      "Test runs",
      "Evidencias",
      "Tags",
      "Configuración",
    ]) {
      await navigate(page, name);
      await noHorizontalOverflow(page);
      if (name === "Casos de prueba")
        await page.screenshot({ path: testInfo.outputPath(`casos-${theme}.png`), fullPage: true });
    }
  }
});

test("Reportes muestra métricas del proyecto y descarga el CSV", async ({ page }) => {
  await navigate(page, "Reportes y métricas");
  await expect(page.getByRole("heading", { name: "Resultados del período" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bugs abiertos y cerrados en el tiempo" }),
  ).toBeVisible();
  await expect(page.getByText("Sin datos", { exact: false }).first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar reporte CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^reporte-.*\.csv$/);
});

test("las acciones de las tablas caben sin recortar sus botones", async ({ page }, testInfo) => {
  const widths =
    testInfo.project.name === "desktop"
      ? [1024, 1180, 1440]
      : [testInfo.project.use.viewport!.width];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ["Bugs", "Casos de prueba"]) {
      await navigate(page, name);
      await noHorizontalOverflow(page);
      const actions = page.locator(".workspace-table__actions button");
      expect(await actions.count()).toBeGreaterThan(0);
      const clipped = await actions.evaluateAll((buttons) =>
        buttons.some((button) => {
          const cell = button.closest("td");
          if (!cell) return true;
          const rect = button.getBoundingClientRect();
          const cellRect = cell.getBoundingClientRect();
          return button.scrollWidth > button.clientWidth + 1 || rect.right > cellRect.right + 1;
        }),
      );
      expect(clipped).toBe(false);
    }
  }
});

test("crear y editar un caso conserva todos los pasos y un solo modal", async ({
  page,
  workspace,
}) => {
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Nuevo caso de prueba", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("region", { name: "Paso 1", exact: true })).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Caso con todos los pasos");
  await dialog.getByLabel("Responsable QA").selectOption("1");
  await dialog.getByRole("textbox", { name: "Acción", exact: true }).fill("Paso uno");
  await dialog
    .getByRole("textbox", { name: "Resultado esperado", exact: true })
    .fill("Resultado uno");
  await dialog.getByRole("button", { name: /Añadir paso/ }).click();
  await dialog.getByRole("textbox", { name: "Acción", exact: true }).nth(1).fill("Paso dos");
  await dialog
    .getByRole("textbox", { name: "Resultado esperado", exact: true })
    .nth(1)
    .fill("Resultado dos");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(workspace.cases.at(-1)?.steps).toHaveLength(2);
  expect(workspace.cases.at(-1)?.assigneeUserId).toBe("1");
  await page.getByText("Caso con todos los pasos", { exact: true }).click();
  await page.getByRole("button", { name: "Editar caso", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByLabel("Responsable QA")).toHaveValue("1");
  await page.getByLabel("Responsable QA").selectOption("");
  await expect(page.getByRole("textbox", { name: "Acción", exact: true })).toHaveCount(2);
  await noHorizontalOverflow(page);
  await page
    .getByRole("textbox", { name: "Acción", exact: true })
    .nth(1)
    .fill("Segundo paso editado");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(workspace.cases.at(-1)?.steps?.map((step) => step.action)).toEqual([
    "Paso uno",
    "Segundo paso editado",
  ]);
  expect(workspace.cases.at(-1)?.assigneeUserId).toBeNull();
});

test("asigna un bug a un integrante del equipo", async ({ page, workspace }) => {
  await navigate(page, "Bugs");
  await page.getByRole("button", { name: "Nuevo bug" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Error asignado");
  await dialog.getByLabel("Responsable QA").selectOption("1");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(workspace.writes.find((item) => item.path === "/bugs")?.body.assigneeUserId).toBe("1");
});

test("los registros muestran Exportar y permiten escoger formato", async ({ page }) => {
  for (const [section, id] of [
    ["Bugs", "BUG-001"],
    ["Casos de prueba", "TC-001"],
  ]) {
    await navigate(page, section);
    await page.getByRole("button", { name: `Exportar ${id}` }).click();
    const dialog = page.getByRole("dialog", { name: `Exportar ${id}` });
    await expect(dialog.getByRole("button", { name: "Exportar como PDF" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Exportar como Excel" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Exportar como Markdown" })).toBeVisible();
    await page.keyboard.press("Escape");
  }
});

test("administra proyectos con confirmación de borrado", async ({ page }) => {
  await navigate(page, "Proyectos");
  await page.getByLabel("Nombre", { exact: true }).fill("Proyecto móvil");
  await page.getByLabel("Descripción", { exact: true }).fill("Pruebas de la aplicación");
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  const project = page.locator(".projects-view__item").filter({ hasText: "Proyecto móvil" });
  await expect(project).toBeVisible();
  await project.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Proyecto actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  const updated = page.locator(".projects-view__item").filter({ hasText: "Proyecto actualizado" });
  await expect(updated).toBeVisible();
  await updated.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(updated.getByText(/Solo se pueden eliminar/)).toBeVisible();
  await updated.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(updated).toHaveCount(0);
});

test("genera y acepta invitaciones de un solo uso", async ({ page, workspace }) => {
  await navigate(page, "Equipos");
  await expect(page.getByText(/un Admin deberá asignarte acceso a cada proyecto/)).toBeVisible();
  await page.getByRole("button", { name: "Generar invitación" }).click();
  await expect(page.getByLabel("Código generado")).toHaveValue("a".repeat(64));
  await page.getByLabel("Código de invitación").fill("a".repeat(64));
  await page.getByRole("button", { name: "Aceptar invitación" }).click();
  await expect(page.getByText("Te uniste al equipo.")).toBeVisible();
  expect(workspace.writes.some((item) => item.path === "/team-invitations/accept")).toBe(true);
});

test("crea, renombra y elimina un equipo vacío", async ({ page }) => {
  await navigate(page, "Equipos");
  await page.getByLabel("Nombre del equipo").fill("Equipo móvil");
  await page.getByRole("button", { name: "Crear equipo" }).click();
  await expect(page.getByRole("combobox", { name: "Equipo", exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Editar equipo" }).click();
  await page.getByLabel("Nombre del equipo").fill("Equipo web");
  await page.getByRole("button", { name: "Guardar equipo" }).click();
  await expect(
    page.getByRole("combobox", { name: "Equipo", exact: true }).locator("option:checked"),
  ).toContainText("Equipo web");
  await page.getByRole("button", { name: "Eliminar equipo", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar eliminación de equipo" }).click();
  await expect(page.getByRole("combobox", { name: "Equipo", exact: true })).toHaveValue("1");
});

test("diseñador guarda y actualiza todos los pasos y descarga Markdown", async ({
  page,
  workspace,
}) => {
  await navigate(page, "Diseñar test cases");
  await page.locator("#case-builder-description").fill("Probar registro");
  await page.getByRole("button", { name: "Mostrar tabla de ejemplo" }).click();
  const card = page.locator(".case-builder__case").first();
  await card.getByRole("button", { name: /Añadir paso/ }).click();
  await card.getByRole("textbox", { name: "Acción", exact: true }).nth(1).fill("Acción adicional");
  await card
    .getByRole("textbox", { name: "Resultado esperado", exact: true })
    .nth(1)
    .fill("Resultado adicional");
  await card.getByRole("button", { name: "Guardar en casos de prueba" }).click();
  await expect(card.getByRole("button", { name: /Actualizar TC-/ })).toBeVisible();
  expect(workspace.cases.at(-1)?.steps).toHaveLength(2);
  await card.getByRole("button", { name: /Añadir paso/ }).click();
  await card.getByRole("textbox", { name: "Acción", exact: true }).nth(2).fill("Tercer paso");
  await card
    .getByRole("textbox", { name: "Resultado esperado", exact: true })
    .nth(2)
    .fill("Tercer resultado");
  await card.getByRole("button", { name: /Actualizar TC-/ }).click();
  await expect.poll(() => workspace.cases.at(-1)?.steps?.length).toBe(3);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Markdown" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  await noHorizontalOverflow(page);
});

test("Test Runs crea, registra resultados, edita, completa y elimina", async ({
  page,
  workspace,
}, testInfo) => {
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Nueva ejecución", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Regresión v1.1");
  await page.getByLabel(/TC-001/).check();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Ejecutar Regresión v1.1", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Resultado", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Editar ejecución", exact: true }).click();
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("Completado");
  await page.getByRole("button", { name: "Guardar ejecución", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Registra");
  await page.getByRole("button", { name: "Cancelar edición" }).click();
  await page.getByRole("combobox", { name: "Resultado", exact: true }).selectOption("passed");
  await page
    .getByRole("textbox", { name: "Notas", exact: true })
    .fill("Verificado en móvil y escritorio");
  await page.getByRole("button", { name: "Guardar resultado", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
  await page.getByRole("button", { name: "Editar ejecución", exact: true }).click();
  await page.getByRole("textbox", { name: "Título", exact: true }).fill("Regresión completada");
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("Completado");
  await page.getByRole("button", { name: "Guardar ejecución", exact: true }).click();
  await expect(page.getByText(/Regresión completada · Completado/)).toBeVisible();
  await noHorizontalOverflow(page);
  expect(workspace.runs[0].results[0].notes).toBe("Verificado en móvil y escritorio");
  await page.screenshot({ path: testInfo.outputPath("ejecucion-completada.png"), fullPage: true });
  await page.getByRole("button", { name: "Eliminar ejecución", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(workspace.runs).toHaveLength(0);
});

test("tipos personalizados disponibles después de recargar", async ({ page }, testInfo) => {
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Diseño de casos", exact: true }).click();
  await page.getByLabel("Nombre del nuevo tipo").fill("Contratos externos");
  await page.getByRole("button", { name: "Añadir tipo de caso" }).click();
  await expect(
    page.getByText("El tipo ya está disponible en el diseñador.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Contratos externos", exact: true }).check();
  await page.getByLabel("Valor inicial para Contratos externos").selectOption("3");
  await page.getByRole("button", { name: "Guardar valores predeterminados" }).click();
  await page.reload();
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Diseño de casos", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Contratos externos", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Valor inicial para Contratos externos")).toHaveValue("3");
  await page.screenshot({ path: testInfo.outputPath("configuracion.png"), fullPage: true });
  await navigate(page, "Diseñar test cases");
  await expect(page.getByRole("checkbox", { name: /^Contratos externos/ })).toBeChecked();
  await expect(page.getByLabel("Cantidad de pruebas: Contratos externos")).toHaveValue("3");
  await navigate(page, "Equipos");
  await page.screenshot({ path: testInfo.outputPath("equipos.png"), fullPage: true });
  await noHorizontalOverflow(page);
});

test("exporta solo registros filtrados y muestra la maqueta de perfil", async ({
  page,
}, testInfo) => {
  await expect(page.getByText("Sesión activa", { exact: true })).toHaveCount(0);
  for (const name of ["Bugs", "Casos de prueba", "Test runs"]) {
    await navigate(page, name);
    if (name === "Test runs") {
      await page.getByRole("button", { name: "Nueva ejecución", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Título", { exact: true }).fill("Ejecución exportable");
      await dialog.getByRole("checkbox").first().check();
      await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    const button = page.getByRole("button", { name: /^Exportar tabla de/ });
    await button.click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar como Markdown", exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.md$/);
    await page.getByRole("textbox", { name: "Buscar registros" }).fill("ninguna-coincidencia");
    await expect(button).toBeDisabled();
    await expect(page.locator(".workspace-table__footer")).toContainText("0 resultados");
    await noHorizontalOverflow(page);
  }
  await navigate(page, "Configuración");
  await expect(page.getByRole("button", { name: "Cambiar imagen (próximamente)" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("perfil-maqueta.png"), fullPage: true });
});
