import { readFile } from "node:fs/promises";
import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const stamp = "2026-11-02T01:00:00Z";
for (const [section, button, kind] of [
  ["Bugs", "Nuevo bug", "bug"],
  ["Casos de prueba", "Nuevo caso de prueba", "case"],
  ["Test runs", "Nueva ejecución", "run"],
] as const)
  test(`el editor de ${kind} comparte identidad, título y propiedades`, async ({
    page,
    workspace,
  }, testInfo) => {
    void workspace;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (kind === "run")
      await page.route("**/api/project-members?*", (route) =>
        route.fulfill({
          json: {
            data: [
              { id: "1", name: "QA Local", role: "Admin", owner: true, revision: 0 },
              { id: "2", name: "Ana Pruebas", role: "QA", owner: false, revision: 1 },
            ],
          },
        }),
      );
    await page.goto("/");
    await navigate(page, section);
    await page.getByRole("button", { name: button, exact: true }).click();
    const dialog = page.getByRole("dialog"),
      title = dialog.getByRole("textbox", { name: "Título", exact: true });
    await title.fill(`Registro ${kind} revisado`);
    await expect(dialog.locator(".work-item-editor__header")).toContainText("Nuevo");
    await expect(dialog.getByRole("region", { name: "Propiedades del registro" })).toBeVisible();
    if (kind === "case")
      await expect(dialog.getByRole("region", { name: "Paso 1", exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`editor-${kind}.png`),
      animations: "disabled",
    });
    if (kind === "run") {
      await dialog.getByRole("checkbox").first().check();
      await dialog
        .getByRole("combobox", { name: "Responsable de ejecución", exact: true })
        .selectOption("2");
    }
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    if (kind === "case") {
      await expect.poll(() => workspace.cases.length).toBe(2);
      await expect(dialog).toHaveCount(0);
    } else if (kind === "bug") await expect(dialog).toHaveCount(0);
    if (kind === "run") {
      await expect(dialog).toHaveCount(0);
      await page.getByRole("button", { name: "Editar RUN-001", exact: true }).click();
      const edit = page.getByRole("dialog");
      await expect(edit.locator(".work-item-editor__header")).toContainText("RUN-001");
      await expect(edit.locator(".test-run__progress")).toBeHidden();
      await expect(
        edit.getByRole("combobox", { name: "Responsable de ejecución", exact: true }),
      ).toHaveValue("2");
      expect(workspace.runs[0].ownerUserId).toBe("2");
      await page.screenshot({
        path: testInfo.outputPath("editar-run.png"),
        animations: "disabled",
      });
      await edit.getByRole("button", { name: "Guardar ejecución", exact: true }).click();
      await expect(page.getByText("Ejecución actualizada.", { exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
    await noHorizontalOverflow(page);
  });

test("asignaciones pagina, busca y abre registros sin confundir usuarios", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  const queries: URLSearchParams[] = [];
  await page.route("**/api/assigned-work?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    const items =
      query.get("page") === "2"
        ? [
            {
              kind: "bug",
              id: "BUG-001",
              title: "Último bug asignado",
              status: "Abierto",
              classification: "Alta",
              createdAt: stamp,
            },
          ]
        : Array.from({ length: 25 }, (_, i) => ({
            kind: "bug",
            id: `BUG-${String(i + 1).padStart(3, "0")}`,
            title: `Asignación ${i + 1}`,
            status: "Abierto",
            classification: "Alta",
            createdAt: stamp,
          }));
    return route.fulfill({
      json: {
        data: {
          items: query.get("search") ? items.slice(0, 1) : items,
          total: query.get("search") ? 1 : 26,
          page: Number(query.get("page")),
          pageSize: 25,
        },
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Mis asignaciones");
  await expect(page.locator(".assigned-work__item")).toHaveCount(25);
  await page
    .getByRole("navigation", { name: "Paginación de asignaciones" })
    .getByRole("button", { name: "Siguiente", exact: true })
    .click();
  await expect(page.getByText("Último bug asignado", { exact: false })).toBeVisible();
  await page.getByLabel("Buscar asignaciones", { exact: true }).fill("BUG-001");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("search")).toBe("BUG-001");
  expect(queries.at(-1)?.get("page")).toBe("1");
  await page.screenshot({
    path: testInfo.outputPath("mis-asignaciones.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.locator(".assigned-work__title").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noHorizontalOverflow(page);
});

test("una respuesta de asignaciones de otro proyecto no reemplaza la lista actual", async ({
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
          role: "Admin",
          name: `Proyecto ${id}`,
          description: "",
        })),
      },
    }),
  );
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    requested = new Promise<void>((resolve) => {
      started = resolve;
    });
  await page.route("**/api/assigned-work?*", async (route) => {
    const id = new URL(route.request().url()).searchParams.get("projectId");
    if (id === "1") {
      started();
      await gate;
    }
    return route.fulfill({
      json: { data: { items: [], total: id === "1" ? 99 : 0, page: 1, pageSize: 25 } },
    });
  });
  await page.goto("/");
  await navigate(page, "Mis asignaciones");
  await requested;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  await expect(page.getByText("0 registros asignados", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("99 registros asignados", { exact: true })).toHaveCount(0);
});

for (const kind of ["bug", "case"] as const)
  test(`el diseñador de ${kind} anexa evidencia al registro guardado`, async ({
    page,
    workspace,
  }) => {
    void workspace;
    const uploaded: string[] = [];
    await page.route("**/api/evidence/upload?*", (route) => {
      const target = new URL(route.request().url()).searchParams.get("related")!;
      uploaded.push(target);
      return route.fulfill({
        status: 201,
        json: {
          data: {
            id: "EVD-002",
            projectId: "1",
            name: "detalle.txt",
            type: "Archivo",
            related: [target],
            sizeBytes: 7,
            hasFile: true,
            createdAt: stamp,
          },
        },
      });
    });
    await page.goto("/");
    await navigate(page, kind === "bug" ? "Diseñar bugs" : "Diseñar test cases");
    if (kind === "bug") {
      await page.getByLabel("Problema observado", { exact: true }).fill("Error al iniciar sesión");
      await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
    } else {
      await page.getByRole("button", { name: /Usar descripción de ejemplo/ }).click();
      await page.getByRole("button", { name: /^Mostrar tabla de ejemplo/ }).click();
    }
    const panel = page.locator(".design-evidence").first();
    await expect(panel).not.toHaveAttribute("open", "");
    await panel.locator("summary").click();
    await panel.getByLabel("Archivo de evidencia del diseño", { exact: true }).setInputFiles({
      name: "detalle.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("detalle"),
    });
    await expect(
      panel.getByRole("button", { name: "Anexar evidencia", exact: true }),
    ).toBeDisabled();
    expect(uploaded).toHaveLength(0);
    if (kind === "bug") {
      await page.getByLabel("Revisé el contenido y confirmo la creación del bug.").check();
      await page.getByRole("button", { name: "Guardar en Bugs", exact: true }).click();
    } else
      await page
        .locator(".case-builder__case")
        .first()
        .getByRole("button", { name: "Guardar en casos de prueba", exact: true })
        .click();
    await panel.getByRole("button", { name: "Anexar evidencia", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Evidencia EVD-002 anexada");
    expect(uploaded).toEqual([kind === "bug" ? "BUG-002" : "TC-002"]);
  });

test("auditoría navega por páginas, conserva la página tras un error y exporta su tabla", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let fail = true;
  await page.route("**/api/activity?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const older = query.has("before");
    if (older && fail) {
      fail = false;
      return route.fulfill({
        status: 503,
        json: { error: { message: "No se pudo cargar la página." } },
      });
    }
    return route.fulfill({
      json: {
        data: Array.from({ length: older ? 2 : 50 }, (_, i) => ({
          id: String((older ? 50 : 100) - i),
          projectId: "1",
          kind: "bug",
          resourceId: `BUG-${(older ? 50 : 100) - i}`,
          action: "bugs.update",
          actorId: "1",
          actorName: "QA Local",
          createdAt: stamp,
          requestId: null,
          before: { status: "Abierto" },
          after: { status: "Resuelto" },
        })),
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Actividad y auditoría");
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(50);
  const paginator = page.getByRole("navigation", { name: "Paginación de auditoría" });
  await paginator.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo cargar la página.");
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(50);
  await paginator.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(2);
  await expect(paginator).toContainText("Página 2");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar página Markdown", exact: true }).click();
  const file = await download;
  const content = await readFile((await file.path())!, "utf8");
  expect(content).toContain("BUG-50");
  expect(content).not.toContain("BUG-100");
  await paginator.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.locator(".audit-table tbody tr")).toHaveCount(50);
  await page.screenshot({
    path: testInfo.outputPath("auditoria-paginada.png"),
    fullPage: true,
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});

test("Test Plan conserva selección al buscar y muestra casos con identidad propia", async ({
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
            name: "Smoke de acceso",
            description: "Pruebas esenciales",
            caseIds: ["TC-001"],
            revision: 1,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Test Plan");
  await page.getByRole("button", { name: "Seleccionar visibles", exact: true }).click();
  await page.getByLabel("Buscar casos del Test Plan", { exact: true }).fill("no coincide");
  await expect(page.getByText("1 caso seleccionado", { exact: true })).toBeVisible();
  await page.getByText("Ver casos del Test Plan", { exact: true }).click();
  await expect(page.locator(".test-plan__card li strong")).toHaveText("TC-001");
  await page.screenshot({
    path: testInfo.outputPath("test-plan-casos.png"),
    fullPage: true,
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});

test("equipos presenta integrantes, el selector de proyecto y Descargar no se quiebran", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/teams/1/members", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", name: "QA Local", role: "owner" },
          { id: "2", name: "Ana Pruebas", role: "member" },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Equipos");
  await expect(page.locator(".team-roster__member")).toHaveCount(2);
  await page.getByLabel("Buscar integrante", { exact: true }).fill("Ana");
  await expect(page.locator(".team-roster__member")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("equipo-integrantes.png"),
    fullPage: true,
    animations: "disabled",
  });
  const picker = page.getByRole("combobox", { name: "Proyecto", exact: true });
  expect((await picker.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await navigate(page, "Mis menciones");
  expect(
    await page
      .locator(".mentions-view__counter strong")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
  ).toBeLessThanOrEqual(16);
  await navigate(page, "Evidencias");
  const button = page.getByRole("button", { name: /Descargar captura/ });
  expect(await button.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe("nowrap");
  await noHorizontalOverflow(page);
});
