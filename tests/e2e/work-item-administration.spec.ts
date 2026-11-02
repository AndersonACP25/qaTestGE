import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const stamp = "2026-11-01T12:00:00Z";
test("lectura masiva explícita conserva avisos al fallar y comparte el contador", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let read = false,
    attempts = 0;
  await page.route("**/api/mention-notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      expect(new URL(route.request().url()).pathname).toBe("/api/mention-notifications/read-all");
      attempts++;
      if (attempts === 1)
        return route.fulfill({
          status: 503,
          json: { error: { message: "No se pudo registrar la lectura masiva." } },
        });
      read = true;
      return route.fulfill({ json: { data: { updated: 105, readAt: stamp } } });
    }
    return route.fulfill({
      json: {
        data: [1, 2].map((id) => ({
          id: `NTF-00${id}`,
          commentId: `CMT-00${id}`,
          target: { kind: "bug", id: "BUG-001" },
          authorName: "Anderson Castillo",
          createdAt: stamp,
          readAt: read ? stamp : null,
        })),
      },
    });
  });
  await page.goto("/");
  const bell = page.getByRole("button", { name: "Notificaciones, 2 sin leer", exact: true });
  await bell.click();
  const popover = page.getByRole("region", { name: "Notificaciones del proyecto" });
  if (testInfo.project.name === "desktop")
    expect((await popover.boundingBox())!.width).toBeGreaterThanOrEqual(540);
  await page.getByRole("button", { name: "Ver todas las menciones →", exact: true }).click();
  const all = page.getByRole("button", { name: "Marcar todas como leídas", exact: true });
  await all.click();
  await expect(page.getByRole("alert")).toContainText("No se pudo registrar la lectura masiva.");
  await expect(bell).toBeVisible();
  await all.click();
  await expect(
    page.getByText("105 menciones marcadas como leídas.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mentions-view__counter strong")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("menciones-masivas.png"), fullPage: true });
  await noHorizontalOverflow(page);
});

test("Admin crea una cuenta con rol y reintenta con la misma clave y contenido", async ({
  page,
  workspace,
}) => {
  void workspace;
  const attempts: { key: string | undefined; body: unknown }[] = [];
  let members = [{ id: "1", name: "QA Local", role: "Admin", owner: true, revision: 0 }];
  await page.route("**/api/project-members**", (route) =>
    route.fulfill({ json: { data: members } }),
  );
  await page.route("**/api/project-users?*", async (route) => {
    attempts.push({
      key: route.request().headers()["idempotency-key"],
      body: route.request().postDataJSON(),
    });
    if (attempts.length === 1)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Respuesta pendiente de confirmar." } },
      });
    const member = { id: "2", name: "Nuevo QA", role: "QA", owner: false, revision: 1 };
    members = [...members, member];
    return route.fulfill({ status: 201, json: { data: member } });
  });
  await page.goto("/");
  await navigate(page, "Accesos al proyecto");
  await page.getByRole("button", { name: "Crear usuario nuevo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del nuevo usuario", { exact: true }).fill("Nuevo QA");
  await dialog.getByLabel("Correo del nuevo usuario", { exact: true }).fill("qa@example.test");
  await dialog.getByLabel("Contraseña inicial", { exact: true }).fill("temporary password");
  await dialog
    .getByRole("combobox", { name: "Rol del nuevo usuario", exact: true })
    .selectOption("QA");
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Respuesta pendiente");
  await expect(dialog.getByLabel("Correo del nuevo usuario", { exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Reintentar creación", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Acceso de Nuevo QA", exact: true }),
  ).toContainText("QA");
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await noHorizontalOverflow(page);
});

test("auditoría guarda configuración y envía filtros al servidor", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let settings = { profile: "General", detail: "Detallado", pageSize: 50, version: 0 };
  const queries: URLSearchParams[] = [];
  await page.route("**/api/audit-settings?*", async (route) => {
    if (route.request().method() === "PUT")
      settings = { ...route.request().postDataJSON(), version: settings.version + 1 };
    return route.fulfill({ json: { data: settings } });
  });
  await page.route("**/api/activity?*", (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/");
  await navigate(page, "Actividad y auditoría");
  await page.getByText("Configuración de auditoría · General", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Perfil predeterminado", exact: true })
    .selectOption("Seguridad");
  await page.getByRole("combobox", { name: "Eventos por página", exact: true }).selectOption("25");
  await page
    .getByRole("button", { name: "Guardar configuración de auditoría", exact: true })
    .click();
  await expect.poll(() => settings.version).toBe(1);
  await expect(
    page.getByRole("combobox", { name: "Perfil de auditoría", exact: true }),
  ).toHaveValue("Seguridad");
  await page.getByRole("combobox", { name: "Tipo de recurso", exact: true }).selectOption("user");
  await page.getByRole("combobox", { name: "Operación", exact: true }).selectOption("provision");
  await page.getByLabel("ID del autor", { exact: true }).fill("1");
  await page.getByLabel("Desde (UTC)", { exact: true }).fill("2026-11-01");
  await page.getByLabel("Hasta (UTC)", { exact: true }).fill("2026-11-01");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("operation")).toBe("provision");
  const query = queries.at(-1)!;
  for (const [key, value] of Object.entries({
    profile: "Seguridad",
    kind: "user",
    actorId: "1",
    from: "2026-11-01",
    to: "2026-11-01",
    limit: "25",
  }))
    expect(query.get(key)).toBe(value);
  await page.screenshot({ path: testInfo.outputPath("auditoria-filtros.png"), fullPage: true });
  await noHorizontalOverflow(page);
});

test("el Work Item organiza propiedades y navegación sin perder edición", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("complementary", { name: "Propiedades del Work Item" }),
  ).toContainText("Abierto");
  await page.screenshot({ path: testInfo.outputPath("work-item-identidad.png") });
  await dialog.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(dialog.locator(".collaboration__history")).toHaveAttribute("open", "");
  await dialog.getByRole("button", { name: "Detalles", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("work-item-bug.png") });
  await dialog.getByRole("button", { name: "Editar bug", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Título", exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});

test("arrastra evidencia al crear un registro y al ejecutar un resultado", async ({
  page,
  workspace,
}) => {
  void workspace;
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Ejecución con evidencia",
    owner: "QA",
    status: "En curso",
    progress: 0,
    caseCount: 1,
    caseIds: ["TC-001"],
    tagIds: [],
    createdAt: stamp,
    results: [
      {
        id: "RES-001",
        caseId: "TC-001",
        title: "Acceso",
        caseVersion: 1,
        steps: [{ action: "Abrir", expectedResult: "Correcto" }],
        status: "skipped",
        notes: "",
        executedAt: null,
      },
    ],
  });
  let uploads = 0;
  await page.route("**/api/evidence/upload?*", (route) => {
    uploads++;
    expect(new URL(route.request().url()).searchParams.get("name")).toBe("prueba.txt");
    return route.fulfill({
      status: 201,
      json: {
        data: {
          id: "EVD-002",
          projectId: "1",
          name: "prueba.txt",
          type: "Archivo",
          related: [],
          sizeBytes: 7,
          hasFile: true,
          createdAt: stamp,
        },
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Evidencias");
  await page.getByRole("button", { name: "Subir evidencia", exact: true }).click();
  const transfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["prueba"], "prueba.txt", { type: "text/plain" }));
    return transfer;
  });
  await page.locator(".file-dropzone").dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByRole("dialog").getByText("prueba.txt", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect.poll(() => uploads).toBe(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Ejecutar Ejecución con evidencia", exact: true }).click();
  const zone = page.locator(".file-dropzone").first();
  await zone.dispatchEvent("drop", { dataTransfer: transfer });
  await expect.poll(() => uploads).toBe(2);
  await expect(page.getByText("Evidencia enlazada al resultado.", { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
});

test("Test Plan separa planificación y catálogo en ambos temas", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/test-plans?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "PLAN-001",
            projectId: "1",
            name: "Regresión de acceso",
            description: "Casos críticos del inicio de sesión.",
            caseIds: ["TC-001"],
            revision: 1,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Test Plan");
  await expect(page.locator(".test-plan__card")).toContainText("Regresión de acceso");
  await page.getByText("Ver casos del Test Plan", { exact: true }).click();
  await expect(page.locator(".test-plan__card li")).toContainText("TC-001");
  await page.screenshot({ path: testInfo.outputPath("test-plan-gestion.png"), fullPage: true });
  await page.getByRole("button", { name: /Tema oscuro/ }).click();
  await noHorizontalOverflow(page);
});

for (const action of ["usuario", "lectura", "auditoría"])
  test(`una respuesta tardía de ${action} conserva su proyecto de origen`, async ({
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
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    const path =
      action === "usuario"
        ? "/project-users"
        : action === "lectura"
          ? "/mention-notifications/read-all"
          : "/audit-settings";
    const method = action === "usuario" ? "POST" : action === "lectura" ? "PATCH" : "PUT";
    if (action === "lectura")
      await page.route("**/api/mention-notifications?*", (route) =>
        route.fulfill({
          json: {
            data:
              new URL(route.request().url()).searchParams.get("projectId") === "1"
                ? [
                    {
                      id: "NTF-001",
                      commentId: "CMT-001",
                      target: { kind: "bug", id: "BUG-001" },
                      authorName: "Autor A",
                      createdAt: stamp,
                      readAt: null,
                    },
                  ]
                : [],
          },
        }),
      );
    await page.route(`**/api${path}?*`, async (route) => {
      if (route.request().method() !== method) return route.fallback();
      started();
      await gate;
      return route.fulfill({
        status: action === "usuario" ? 201 : 200,
        json: {
          data:
            action === "usuario"
              ? { id: "2", name: "Usuario A", role: "QA", owner: false, revision: 1 }
              : action === "lectura"
                ? { updated: 1, readAt: stamp }
                : { profile: "Seguridad", detail: "Detallado", pageSize: 50, version: 1 },
        },
      });
    });
    await page.goto("/");
    if (action === "usuario") {
      await navigate(page, "Accesos al proyecto");
      await page.getByRole("button", { name: "Crear usuario nuevo", exact: true }).click();
      await page.getByLabel("Nombre del nuevo usuario", { exact: true }).fill("Usuario A");
      await page.getByLabel("Correo del nuevo usuario", { exact: true }).fill("a@example.test");
      await page.getByLabel("Contraseña inicial", { exact: true }).fill("temporary password");
      await page.getByRole("button", { name: "Crear usuario", exact: true }).click();
    } else if (action === "lectura") {
      await navigate(page, "Mis menciones");
      await page.getByRole("button", { name: "Marcar todas como leídas", exact: true }).click();
    } else {
      await navigate(page, "Actividad y auditoría");
      await page.getByText("Configuración de auditoría · General", { exact: true }).click();
      await page
        .getByRole("button", { name: "Guardar configuración de auditoría", exact: true })
        .click();
    }
    await requested;
    await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
    const response = page.waitForResponse(
      (r) => r.request().method() === method && new URL(r.url()).pathname === `/api${path}`,
    );
    release();
    await response;
    await expect(
      page.getByText(
        /Usuario A creado|mención marcada como leída|Configuración de auditoría guardada/,
      ),
    ).toHaveCount(0);
    if (action === "lectura")
      await expect(page.locator(".mentions-view__counter strong")).toHaveText("0");
  });
