import { test, expect, navigate, noHorizontalOverflow } from "./fixture";

test("actualiza la conexión y propone un borrador solo tras confirmar el envío", async ({
  page,
  workspace,
}) => {
  const issue = "Al pulsar Guardar, el formulario vuelve al listado sin aviso.";
  let connected = false;
  let requests = 0;
  await page.route("**/api/ai/settings", async (route) => {
    if (route.request().method() === "PUT") connected = true;
    if (route.request().method() === "DELETE") connected = false;
    await route.fulfill({
      json: {
        data: {
          visualAvailable: true,
          source: connected ? "account" : "none",
          revision: connected ? "d8462c84-2c14-4226-8a37-aadbb7c746d1" : null,
        },
      },
    });
  });
  await page.route("**/api/ai/bug-proposals", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      projectId: "1",
      consent: true,
      description: issue,
    });
    if (requests === 1) {
      await route.fulfill({
        status: 429,
        json: {
          error: { code: "AI_PROVIDER_QUOTA", message: "Gemini alcanzó su límite de solicitudes." },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          title: "Guardar vuelve al listado sin aviso",
          description: "El formulario vuelve al listado y omite el aviso.",
          priority: "Alta",
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.getByText("IA no conectada", { exact: true })).toBeVisible();
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Inteligencia artificial" }).click();
  await page.getByLabel("Clave de API de Google AI Studio").fill("fake-gemini-browser-test");
  await page.getByRole("button", { name: "Conectar Gemini" }).click();
  await expect(page.getByText("IA conectada", { exact: true })).toBeVisible();
  await navigate(page, "Diseñar bugs");
  await page.getByLabel("Problema observado").fill(issue);
  await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
  const title = page.getByLabel("Título del bug");
  await title.fill("Borrador anterior");

  const propose = page.getByRole("button", { name: "Proponer con Gemini" });
  const dialog = page.getByRole("dialog", { name: "Enviar texto a Gemini" });
  const send = dialog.getByRole("button", { name: "Enviar y generar propuesta" });
  await propose.click();
  await expect(dialog.getByText(issue)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect(requests).toBe(0);
  await propose.click();
  await send.click();
  await expect(page.getByText("Gemini alcanzó su límite de solicitudes.")).toBeVisible();
  await expect(title).toHaveValue("Borrador anterior");
  await propose.click();
  await send.click();
  await expect(title).toHaveValue("Guardar vuelve al listado sin aviso");
  await expect(page.getByRole("combobox", { name: /^Prioridad/ })).toHaveValue("Alta");
  expect(workspace.writes.filter(({ path }) => path === "/bugs")).toHaveLength(0);
  await title.fill("Incidencia revisada");
  await page
    .getByRole("checkbox", { name: "Revisé el contenido y confirmo la creación del bug." })
    .check();
  await page.getByRole("button", { name: "Guardar en Bugs" }).click();
  await expect
    .poll(() => workspace.writes.find(({ path }) => path === "/bugs")?.body.title)
    .toBe("Incidencia revisada");

  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Inteligencia artificial" }).click();
  await page.getByRole("button", { name: "Desconectar Gemini" }).click();
  await expect(page.getByText("IA no conectada", { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});

test("descarta una propuesta pendiente al cambiar de proyecto", async ({ page, workspace }) => {
  void workspace;
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: ["1", "2"].map((id) => ({
          id,
          organizationId: "1",
          name: `Proyecto ${id}`,
          description: "",
          role: "QA",
        })),
      },
    }),
  );
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: { data: { visualAvailable: true, source: "environment", revision: null } },
    }),
  );
  const release = Promise.withResolvers<void>();
  await page.route("**/api/ai/bug-proposals", async (route) => {
    await release.promise;
    await route.fulfill({
      json: {
        data: {
          title: "Propuesta del primer proyecto",
          description: "Detalles de origen",
          priority: "Media",
        },
      },
    });
  });
  try {
    await page.goto("/");
    await navigate(page, "Diseñar bugs");
    await page.getByLabel("Problema observado").fill("Problema del primer proyecto.");
    await page.getByRole("button", { name: "Proponer con Gemini" }).click();
    const started = page.waitForRequest("**/api/ai/bug-proposals");
    await page.getByRole("button", { name: "Enviar y generar propuesta" }).click();
    expect((await started).postDataJSON().projectId).toBe("1");
    await expect(page.getByText("Generando propuesta con Gemini…")).toBeVisible();
    await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
    release.resolve();
    await expect(page.getByLabel("Problema observado")).toHaveValue("");
    await expect(page.getByLabel("Título del bug")).toHaveCount(0);
    await expect(page.getByText("Propuesta de Gemini lista para revisar.")).toHaveCount(0);
  } finally {
    release.resolve();
  }
});
