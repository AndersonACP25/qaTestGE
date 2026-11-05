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
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ai/bug-proposals", async (route) => {
    await pending;
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
    release();
    await expect(page.getByLabel("Problema observado")).toHaveValue("");
    await expect(page.getByLabel("Título del bug")).toHaveCount(0);
    await expect(page.getByText("Propuesta de Gemini lista para revisar.")).toHaveCount(0);
  } finally {
    release();
  }
});

test("genera casos de Gemini con consentimiento y guarda solo el caso revisado", async ({
  page,
  workspace,
}) => {
  const description = "El inicio de sesión bloquea el acceso con una contraseña incorrecta.";
  const title = "Bloqueo por contraseña incorrecta";
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({
      json: { data: { source: "environment", revision: null, visualAvailable: true } },
    }),
  );
  let requests = 0;
  await page.route("**/api/ai/case-proposals", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      projectId: "1",
      consent: true,
      description,
      categories: [{ label: "Edge cases", count: 1 }],
    });
    await route.fulfill({
      json: {
        data: [
          {
            categoryIndex: 0,
            title,
            steps: [
              { action: "Introduce una contraseña incorrecta", expected: "El acceso se bloquea" },
            ],
          },
        ],
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Diseñar test cases");
  await page.getByLabel("Descripción o requisito", { exact: true }).fill(description);
  await page.getByRole("button", { name: "Proponer con Gemini" }).click();
  const dialog = page.getByRole("dialog", { name: "Enviar texto a Gemini" });
  await expect(dialog.getByText(description)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Proponer con Gemini" }).click();
  await dialog.getByRole("button", { name: "Enviar y generar propuesta" }).click();
  await expect(page.getByLabel("Título del caso", { exact: true })).toHaveValue(title);
  expect(workspace.writes.filter(({ path }) => path === "/test-cases")).toHaveLength(0);
  await page.getByLabel("Título del caso", { exact: true }).fill("Rechazo de contraseña inválida");
  await page.getByRole("button", { name: "Guardar en casos de prueba" }).click();
  await expect
    .poll(() => workspace.writes.find(({ path }) => path === "/test-cases")?.body.title)
    .toBe("Rechazo de contraseña inválida");
  await noHorizontalOverflow(page);
});

test("Guardar todos valida el lote y reanuda pendientes sin duplicar casos confirmados", async ({
  page,
  workspace,
}) => {
  const calls: { key: string; body: Record<string, unknown> }[] = [];
  await page.route("**/api/test-cases", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.fallback();
    calls.push({ key: request.headers()["idempotency-key"], body: request.postDataJSON() });
    if (calls.length === 2) {
      await route.fulfill({
        status: 503,
        json: {
          error: { code: "DATABASE_UNAVAILABLE", message: "Servicio temporalmente no disponible." },
        },
      });
      return;
    }
    await route.fallback();
  });
  await page.goto("/");
  await navigate(page, "Diseñar test cases");
  await page
    .getByLabel("Descripción o requisito", { exact: true })
    .fill("Validar límites del registro.");
  await page.getByLabel("Cantidad de pruebas: Edge cases", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Mostrar tabla de ejemplo" }).click();
  const all = page.getByRole("button", { name: "Guardar todos", exact: true });
  const confirm = page.getByRole("button", { name: "Confirmar guardado", exact: true });
  const lastAction = page
    .locator(".case-builder__case")
    .last()
    .getByRole("textbox", { name: "Acción", exact: true });
  await expect(lastAction).toBeVisible();
  const previousAction = await lastAction.inputValue();
  await lastAction.fill("");
  await all.click();
  await confirm.click();
  await expect(page.getByText(/Guardado detenido \(0\/3\)/)).toBeVisible();
  expect(calls).toHaveLength(0);
  await lastAction.fill(previousAction);
  await all.click();
  await confirm.click();
  await expect(page.getByText(/Guardado detenido \(1\/3\)/)).toBeVisible();
  expect(calls).toHaveLength(2);
  await expect(page.getByText("2 casos pendientes", { exact: true })).toBeVisible();
  await all.click();
  await confirm.click();
  await expect(page.getByText("Se guardaron los casos pendientes (2/2).")).toBeVisible();
  expect(calls).toHaveLength(4);
  expect(calls[2]).toEqual(calls[1]);
  expect(new Set(calls.map(({ key }) => key)).size).toBe(3);
  expect(workspace.cases).toHaveLength(4);
  await expect(all).toBeDisabled();
});

test("Guardar todos detiene las creaciones pendientes al cambiar de proyecto", async ({
  page,
  workspace,
}) => {
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
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: string[] = [];
  await page.route("**/api/test-cases", async (route) => {
    if (route.request().method() === "POST") {
      writes.push(route.request().postDataJSON().projectId);
      await pending;
    }
    await route.fallback();
  });
  try {
    await page.goto("/");
    await navigate(page, "Diseñar test cases");
    const description = page.getByLabel("Descripción o requisito", { exact: true });
    await description.fill("Validar dos casos del primer proyecto.");
    await page.getByLabel("Cantidad de pruebas: Edge cases", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Mostrar tabla de ejemplo" }).click();
    await page.getByRole("button", { name: "Guardar todos", exact: true }).click();
    const firstRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === "/api/test-cases" && request.method() === "POST",
    );
    await page.getByRole("button", { name: "Confirmar guardado", exact: true }).click();
    await firstRequest;
    await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
    const firstResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/test-cases" &&
        response.request().method() === "POST",
    );
    release();
    expect((await firstResponse).status()).toBe(201);
    await expect(description).toHaveValue("");
    await expect(page.getByText(/Se guardaron los casos pendientes/)).toHaveCount(0);
    expect(writes).toEqual(["1"]);
  } finally {
    release();
  }
});
