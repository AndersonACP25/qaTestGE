import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
import { bugDraftsKey } from "../../src/models/bugDesign";
const stamp = "2026-11-01T12:00:00Z";

test("la campana comparte lecturas explícitas, conserva el aviso al fallar y enlaza la bandeja", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let read = false,
    attempts = 0;
  await page.route("**/api/mention-notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      attempts++;
      if (attempts === 1)
        await route.fulfill({
          status: 503,
          json: { error: { message: "No se pudo registrar la lectura." } },
        });
      else {
        read = true;
        await route.fulfill({ status: 204 });
      }
    } else
      await route.fulfill({
        json: {
          data: [
            {
              id: "NTF-001",
              commentId: "CMT-001",
              target: { kind: "bug", id: "BUG-001" },
              authorName: "Anderson Castillo",
              createdAt: stamp,
              readAt: read ? stamp : null,
            },
          ],
        },
      });
  });
  await page.goto("/");
  const bell = page.getByRole("button", { name: "Notificaciones, 1 sin leer", exact: true });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page.getByRole("region", { name: "Notificaciones del proyecto" })).toContainText(
    "Anderson Castillo te mencionó",
  );
  await page.getByRole("button", { name: "Ver todas las menciones →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mis menciones", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abrir registro", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(attempts).toBe(0);
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  const mark = page.getByRole("button", { name: "Marcar como leída", exact: true });
  await mark.click();
  await expect(page.getByText("No se pudo registrar la lectura.", { exact: true })).toBeVisible();
  await expect(bell).toBeVisible();
  await mark.click();
  await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();
  await expect(page.locator(".mentions-view__state")).toHaveText("Leída");
  await page.getByRole("button", { name: "Sin leer", exact: true }).click();
  await expect(page.getByText("Sin menciones en este filtro", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("menciones-lectura-explicita.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("el botón de menciones inserta un usuario seleccionado en la posición del cursor", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.route("**/api/project-members?*", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "1", name: "Anderson Castillo", role: "Admin", owner: true, revision: 0 }],
      },
    }),
  );
  let sent = "";
  await page.route("**/api/comments**", async (route) => {
    if (route.request().method() === "POST") {
      sent = route.request().postDataJSON().body;
      await route.fulfill({
        status: 201,
        json: {
          data: {
            id: "CMT-001",
            projectId: "1",
            authorId: "1",
            authorName: "QA Local",
            target: { kind: "bug", id: "BUG-001" },
            body: sent,
            version: 1,
            createdAt: stamp,
            editedAt: null,
            deletedAt: null,
            mentions: [{ id: "1", name: "Anderson Castillo" }],
          },
        },
      });
    } else await route.fulfill({ json: { data: [] } });
  });
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  const input = page.getByLabel("Nuevo comentario", { exact: true });
  await input.fill("Revisar por favor.");
  await input.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(8, 8));
  await page.getByRole("button", { name: "Mencionar usuario", exact: true }).click();
  await page.getByLabel("Buscar usuario para mencionar", { exact: true }).fill("Anderson");
  await page.getByRole("button", { name: "@Anderson Castillo", exact: true }).click();
  await expect(input).toHaveValue("Revisar @Anderson Castillo por favor.");
  await page.getByRole("button", { name: "Publicar comentario", exact: true }).click();
  await expect.poll(() => sent).toBe("Revisar @[Anderson Castillo](user:1) por favor.");
});

test("el modal importa CSV al arrastrar un archivo fuera de la zona de selección", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Subir archivo", exact: true })).toBeVisible();
  const files = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(
        [
          "titulo,descripcion,prioridad,severidad,entorno,version\nBug arrastrado,Detalle,Media,Alta,QA,v1",
        ],
        "bugs.csv",
        { type: "text/csv" },
      ),
    );
    return data;
  });
  await dialog.locator(".analytics__form").dispatchEvent("drop", { dataTransfer: files });
  await expect(dialog.getByText("Bug arrastrado · Media · Alta", { exact: true })).toBeVisible();
  expect(workspace.writes.filter((write) => write.path === "/bugs")).toHaveLength(0);
  await dialog.getByRole("button", { name: "Confirmar importación de pendientes" }).click();
  await expect
    .poll(() => workspace.writes.filter((write) => write.path === "/bugs").length)
    .toBe(1);
});

test("editar pasos mantiene separados los campos y guarda formato sin superposiciones", async ({
  page,
  workspace,
}, testInfo) => {
  await page.goto("/");
  await navigate(page, "Casos de prueba");
  await page.getByRole("button", { name: "Editar TC-001", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    first = dialog.getByRole("region", { name: "Paso 1", exact: true });
  const action = first.getByLabel("Acción", { exact: true });
  await action.fill("Abrir sesión");
  await action.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(0, 5));
  await first
    .locator(".rich-textarea")
    .first()
    .getByRole("button", { name: "Negrita", exact: true })
    .click();
  await expect(action).toHaveValue("**Abrir** sesión");
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(160);
  const fields = await first.locator(".rich-textarea").evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  expect(fields[0].right <= fields[1].left || fields[0].bottom <= fields[1].top).toBe(true);
  expect(await dialog.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(
    1,
  );
  await page.screenshot({
    path: testInfo.outputPath("editor-pasos.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => workspace.cases[0].steps[0].action).toBe("**Abrir** sesión");
});

test("un borrador antiguo se guarda con confirmación y una clave válida estable", async ({
  page,
  workspace,
}) => {
  await page.goto("/");
  await page.evaluate(({ key, draft }) => localStorage.setItem(key, JSON.stringify([draft])), {
    key: bugDraftsKey("1", "1"),
    draft: {
      id: "borrador-antiguo",
      source: "Error de acceso",
      templateId: "",
      title: "Bug del borrador",
      description: "Detalle",
      priority: "Media",
      tagIds: [],
    },
  });
  let key = "";
  await page.route("**/api/bugs", async (route) => {
    key = route.request().headers()["idempotency-key"];
    await route.fallback();
  });
  await navigate(page, "Diseñar bugs");
  await page.getByRole("button", { name: "Abrir borrador", exact: true }).click();
  await page.getByRole("button", { name: "Guardar en Bugs", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Guardar bug en Bugs", exact: true }),
  ).toBeVisible();
  expect(workspace.writes.filter((write) => write.path === "/bugs")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirmar y guardar", exact: true }).click();
  await expect(page.getByText("Bug BUG-002 guardado en Bugs.", { exact: true })).toBeVisible();
  expect(key).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test("la carga de evidencia desde un bug usa un solo modal de alto estable", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/evidence/upload?*", (route) =>
    route.fulfill({
      status: 201,
      json: {
        data: {
          id: "EVD-002",
          projectId: "1",
          name: "captura.png",
          type: "Imagen",
          sizeBytes: 10,
          related: ["BUG-001"],
          hasFile: true,
          createdAt: stamp,
        },
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  expect(
    parseFloat(
      await page.locator(".record-view__id").evaluate((node) => getComputedStyle(node).fontSize),
    ),
  ).toBeGreaterThanOrEqual(18);
  await page.getByRole("button", { name: "Subir evidencia", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  const dialog = page.getByRole("dialog");
  const before = (await dialog.boundingBox())!.height;
  await page
    .getByLabel("Archivo", { exact: true })
    .setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: Buffer.from("image") });
  expect(Math.abs((await dialog.boundingBox())!.height - before)).toBeLessThanOrEqual(60);
  expect((await dialog.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
  await page.screenshot({
    path: testInfo.outputPath("subir-evidencia-bug.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Guardar evidencia", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Evidencia EVD-002 guardada.", { exact: true })).toBeVisible();
});

test("guardar un resultado de Test Run conserva la posición del caso ejecutado", async ({
  page,
  workspace,
}) => {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Regresión larga",
    owner: "QA",
    status: "En curso",
    progress: 0,
    tagIds: [],
    caseIds: ["TC-001"],
    caseCount: 6,
    createdAt: stamp,
    results: Array.from({ length: 6 }, (_, index) => ({
      id: `RES-${index + 1}`,
      caseId: `TC-${index + 1}`,
      title: `Caso ${index + 1}`,
      caseVersion: 1,
      status: "skipped",
      notes: "",
      executedAt: null,
      steps: [{ action: "Abrir", expectedResult: "Correcto" }],
    })),
  });
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Ejecutar Regresión larga", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    result = dialog.locator(".test-run__result").nth(3);
  await result.getByRole("combobox", { name: "Resultado", exact: true }).selectOption("passed");
  await result.getByLabel("Notas", { exact: true }).fill("Comprobado");
  const button = result.getByRole("button", { name: "Guardar resultado", exact: true });
  await button.scrollIntoViewIfNeeded();
  const body = dialog.locator(".workspace__dialog-body"),
    before = await body.evaluate((node) => node.scrollTop);
  expect(before).toBeGreaterThan(300);
  await button.click();
  await expect(result.getByText("Resultado de TC-4 guardado.", { exact: true })).toBeVisible();
  await expect
    .poll(() => body.evaluate((node, original) => Math.abs(node.scrollTop - original), before))
    .toBeLessThan(80);
  await expect(result.getByLabel("Notas", { exact: true })).toHaveValue("Comprobado");
});

test("las confirmaciones no reservan espacio doble para scroll y el historial es descendente sin números", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.route("**/api/activity?*", (route) =>
    route.fulfill({
      json: {
        data: [1, 3, 2].map((id) => ({
          id: String(id),
          projectId: "1",
          kind: "bug",
          resourceId: "BUG-001",
          action: "bugs.update",
          actorId: "1",
          actorName: `Cambio ${id}`,
          createdAt: `2026-11-01T1${id}:00:00Z`,
          requestId: `request-${id}`,
          before: {},
          after: {},
        })),
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.getByRole("button", { name: "Eliminar BUG-001", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    body = dialog.locator(".workspace__dialog-body");
  expect(await dialog.evaluate((node) => getComputedStyle(node).scrollbarGutter)).toBe("auto");
  expect(await body.evaluate((node) => getComputedStyle(node).scrollbarGutter)).toBe("auto");
  const box = (await dialog.boundingBox())!,
    remove = (await dialog
      .getByRole("button", { name: "Eliminar bug", exact: true })
      .boundingBox())!;
  expect(box.x + box.width - remove.x - remove.width).toBeLessThanOrEqual(26);
  await page.screenshot({
    path: testInfo.outputPath("confirmacion-sin-relleno.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.locator(".bug-title").first().click();
  await page.getByText("Ver historial de actividad del registro", { exact: true }).click();
  const history = page.locator(".collaboration__activity");
  await expect(history.locator("li").first()).toContainText("Cambio 3");
  await expect(history.locator("li").last()).toContainText("Cambio 1");
  expect(await history.evaluate((node) => getComputedStyle(node).listStyleType)).toBe("none");
});

test("una lectura tardía no modifica las notificaciones de otro proyecto", async ({
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
          role: "Admin",
        })),
      },
    }),
  );
  let release!: () => void, started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/mention-notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      started();
      await waiting;
      await route.fulfill({ status: 204 });
    } else
      await route.fulfill({
        json: {
          data:
            new URL(route.request().url()).searchParams.get("projectId") === "1"
              ? [
                  {
                    id: "NTF-001",
                    commentId: "CMT-001",
                    target: { kind: "bug", id: "BUG-001" },
                    authorName: "QA Local",
                    createdAt: stamp,
                    readAt: null,
                  },
                ]
              : [],
        },
      });
  });
  await page.goto("/");
  await navigate(page, "Mis menciones");
  await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
  await requested;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  await expect(
    page.getByText("No tienes menciones en este proyecto.", { exact: true }),
  ).toBeVisible();
  const response = page.waitForResponse(
    (item) => item.request().method() === "PATCH" && item.url().includes("mention-notifications"),
  );
  release();
  await response;
  await expect(page.getByText("Mención marcada como leída.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();
});
