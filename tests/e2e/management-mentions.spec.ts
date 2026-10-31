import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const stamp = "2026-10-30T12:00:00Z";
test("gestión en Configuración, badge y Wiki por categorías", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Proyectos", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Equipos", exact: true })).toHaveCount(0);
  await expect(page.locator(".role-badge")).toHaveText("Admin");
  await expect(page.getByText("Rol del proyecto: Admin", { exact: true })).toHaveCount(0);
  await navigate(page, "Proyectos");
  await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear proyecto", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Equipos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Unirse a un equipo" })).toBeVisible();
  await navigate(page, "Wiki");
  await expect(page.getByRole("heading", { name: "Tu guía de trabajo en qaTestGE" })).toBeVisible();
  await page.getByLabel("Buscar en la Wiki").fill("menciones");
  await expect(page.locator(".wiki-hub__card")).not.toHaveCount(0);
  await page.getByLabel("Buscar en la Wiki").fill("sin-resultados-inventados");
  await expect(page.getByRole("heading", { name: "No encontramos una guía" })).toBeVisible();
  await page.getByRole("button", { name: "Ver todas las guías" }).click();
  await page.getByRole("button", { name: "Administración", exact: true }).click();
  await expect(page.locator(".wiki-hub__category").first()).toHaveText("Administración");
  await page.screenshot({ path: testInfo.outputPath("wiki-distribucion.png"), fullPage: true });
  await noHorizontalOverflow(page);
});

test("Hasta anterior a Desde se rechaza sin consultar ni mostrar éxito", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let reads = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/analytics?")) reads++;
  });
  await page.goto("/");
  await navigate(page, "Reportes y métricas");
  await expect(page.getByRole("heading", { name: "Resultados del período" })).toBeVisible();
  const before = reads;
  await page.getByLabel("Desde", { exact: true }).fill("2026-10-20");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-10-10");
  await expect(
    page.getByText("Hasta no puede ser anterior a Desde.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Aplicar período" })).toBeDisabled();
  expect(reads).toBe(before);
  await expect(page.getByLabel("Hasta", { exact: true })).toHaveAttribute("min", "2026-10-20");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-10-20");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(
    page.getByText("Período aplicado. Los indicadores están actualizados.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("reportes-resumen.png"),
    fullPage: true,
    animations: "disabled",
  });
  await noHorizontalOverflow(page);
});

test("los encabezados de edición permanecen fijos al desplazar el contenido", async ({
  page,
  workspace,
}) => {
  workspace.cases[0].steps = Array.from({ length: 30 }, (_, i) => ({
    action: `Paso largo ${i + 1}`,
    expectedResult: "Resultado esperado",
  }));
  const width = page.viewportSize()!.width;
  await page.setViewportSize({ width, height: 600 });
  await page.goto("/");
  for (const name of ["Bugs", "Casos de prueba"]) {
    await navigate(page, name);
    await page
      .locator("tbody")
      .getByRole("button", { name: /^Editar (BUG|TC)-/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog"),
      heading = dialog.locator(".workspace__dialog-heading"),
      body = dialog.locator(".workspace__dialog-body");
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    const top = (await heading.boundingBox())!.y;
    expect(
      parseFloat(await body.evaluate((e) => getComputedStyle(e).paddingLeft)),
    ).toBeGreaterThanOrEqual(16);
    await body.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
    expect(Math.abs((await heading.boundingBox())!.y - top)).toBeLessThanOrEqual(1);
    await expect(dialog.getByRole("button", { name: "Cerrar ventana" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar ventana" }).click();
  }
  await noHorizontalOverflow(page);
});

test("publicar @nombre completo entrega un aviso a la otra cuenta y mantiene separación", async ({
  page,
  workspace,
}) => {
  void workspace;
  let actor = "1";
  let comments: object[] = [];
  let notification = false,
    read = false;
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        data: {
          user: {
            id: actor,
            name: actor === "1" ? "QA Local" : "María Dev",
            email: actor === "1" ? "qa@example.test" : "dev@example.test",
          },
          csrfToken: "test-csrf",
        },
      },
    }),
  );
  await page.route("**/api/project-members?*", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", name: "QA Local", role: "Admin", owner: true, revision: 0 },
          { id: "2", name: "María Dev", role: "Dev", owner: false, revision: 1 },
        ],
      },
    }),
  );
  await page.route("**/api/comments**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.body).toContain("@[María Dev](user:2)");
      notification = true;
      comments = [
        {
          id: "CMT-001",
          projectId: "1",
          target: body.target,
          body: body.body,
          version: 1,
          createdAt: stamp,
          editedAt: null,
          deletedAt: null,
          authorId: "1",
          authorName: "QA Local",
          mentions: [{ id: "2", name: "María Dev" }],
        },
      ];
      await route.fulfill({ status: 201, json: { data: comments[0] } });
    } else await route.fulfill({ json: { data: comments } });
  });
  await page.route("**/api/mention-notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      read = true;
      await route.fulfill({ status: 204 });
    } else
      await route.fulfill({
        json: {
          data:
            notification && actor === "2"
              ? [
                  {
                    id: "NTF-001",
                    commentId: "CMT-001",
                    target: { kind: "bug", id: "BUG-001" },
                    authorName: "QA Local",
                    createdAt: stamp,
                    readAt: read ? stamp : null,
                  },
                ]
              : [],
        },
      });
  });
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  await page.getByLabel("Nuevo comentario", { exact: true }).fill("Revisar @María Dev, por favor.");
  await page.getByRole("button", { name: "Publicar comentario", exact: true }).click();
  await expect(page.getByText("Comentario publicado.", { exact: true })).toBeVisible();
  const card = page.locator(".collaboration__comment").first(),
    header = await card.locator("header").boundingBox(),
    body = await card.locator(".collaboration__body").boundingBox();
  expect(body!.y - header!.y - header!.height).toBeGreaterThanOrEqual(15);
  await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
  actor = "2";
  await page.reload();
  await navigate(page, "Mis menciones");
  await expect(page.getByText("QA Local te mencionó en BUG-001", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abrir registro", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => read).toBe(true);
  await noHorizontalOverflow(page);
});

test("Mis menciones detecta avisos nuevos mientras la ventana sigue abierta", async ({
  page,
  workspace,
}) => {
  void workspace;
  let delivered = false;
  await page.clock.install();
  await page.route("**/api/mention-notifications?*", (route) =>
    route.fulfill({
      json: {
        data: delivered
          ? [
              {
                id: "NTF-002",
                commentId: "CMT-002",
                target: { kind: "bug", id: "BUG-001" },
                authorName: "María Dev",
                createdAt: stamp,
                readAt: null,
              },
            ]
          : [],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Mis menciones");
  await expect(
    page.getByText("No tienes menciones en este proyecto.", { exact: true }),
  ).toBeVisible();
  delivered = true;
  await page.clock.fastForward(16000);
  await expect(page.getByText("María Dev te mencionó en BUG-001", { exact: true })).toBeVisible();
});
