import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
const stamp = "2026-11-01T12:00:00Z";

test("diseña y guarda un bug con formato y lo abre en el mantenimiento", async ({
  page,
  workspace,
}) => {
  void workspace;
  let saved: Record<string, unknown> | null = null;
  await page.route("**/api/bugs**", async (route) => {
    if (route.request().method() === "POST") {
      saved = {
        ...route.request().postDataJSON(),
        id: "BUG-002",
        status: "Abierto",
        project: "QA",
        assignee: "",
        createdAt: stamp,
      };
      await route.fulfill({ status: 201, json: { data: saved } });
    } else await route.fulfill({ json: { data: saved ? [saved] : [] } });
  });
  await page.goto("/");
  await navigate(page, "Diseñar bugs");
  const input = page.getByLabel("Problema observado", { exact: true });
  await input.fill("Error de acceso");
  await input.evaluate((e: HTMLTextAreaElement) => e.setSelectionRange(0, 5));
  await input.locator("..").getByRole("button", { name: "Negrita", exact: true }).click();
  await expect(input).toHaveValue("**Error** de acceso");
  await input.locator("..").getByRole("button", { name: "Vista previa", exact: true }).click();
  await expect(page.locator(".rich-textarea__preview strong")).toHaveText("Error");
  await input.locator("..").getByRole("button", { name: "Editar texto", exact: true }).click();
  await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
  await page.getByLabel("Revisé el contenido y confirmo la creación del bug.").check();
  await page.getByRole("button", { name: "Guardar en Bugs", exact: true }).click();
  await expect(page.getByText("Bug BUG-002 guardado en Bugs.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver en Bugs", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Error");
  await expect(page.getByText(/datos del proyecto/)).toHaveCount(0);
  await expect(page.getByText(/Cuenta de /)).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test("formato en campos de formulario se guarda por FormData y escapa HTML", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await navigate(page, "Bugs");
  await page.getByRole("button", { name: "Nuevo bug", exact: true }).click();
  const description = page.getByLabel("Descripción", { exact: true });
  await page.getByLabel("Título", { exact: true }).fill("Bug con formato");
  await description.fill("<img src=x onerror=alert(1)> Nota");
  await description.evaluate((e: HTMLTextAreaElement) =>
    e.setSelectionRange(e.value.length - 4, e.value.length),
  );
  await description.locator("..").getByRole("button", { name: "Cursiva", exact: true }).click();
  await expect(description).toHaveValue("<img src=x onerror=alert(1)> *Nota*");
  await description
    .locator("..")
    .getByRole("button", { name: "Vista previa", exact: true })
    .click();
  await expect(page.locator(".rich-textarea__preview em")).toHaveText("Nota");
  await expect(page.locator(".rich-textarea__preview img")).toHaveCount(0);
  await description
    .locator("..")
    .getByRole("button", { name: "Editar texto", exact: true })
    .click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect
    .poll(() => workspace.writes.find((w) => w.path === "/bugs")?.body.description)
    .toBe("<img src=x onerror=alert(1)> *Nota*");
});

test("eliminar una ejecución muestra solo confirmación y conserva el registro al cancelar", async ({
  page,
  workspace,
}) => {
  workspace.runs.push({
    id: "RUN-001",
    projectId: "1",
    title: "Smoke",
    owner: "QA",
    status: "En curso",
    caseIds: [],
    caseCount: 0,
    tagIds: [],
    progress: 0,
    results: [],
    createdAt: stamp,
  });
  await page.goto("/");
  await navigate(page, "Test runs");
  await page.getByRole("button", { name: "Eliminar RUN-001", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Eliminar RUN-001" })).toBeVisible();
  await expect(dialog.getByText("Resultados por caso", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Exportar informe PDF" })).toHaveCount(0);
  await expect(dialog.getByText("Comentarios y actividad", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancelar eliminación" }).click();
  await expect(page.getByText("Smoke", { exact: true })).toBeVisible();
  expect(workspace.writes.filter((w) => w.path.includes("test-runs"))).toHaveLength(0);
  await noHorizontalOverflow(page);
});

test("avisos flotantes mantienen ancho compacto y descargas de evidencia están en la fila", async ({
  page,
  workspace,
}) => {
  void workspace;
  await page.goto("/");
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  const alert = page.locator(".workspace-toast");
  await expect(alert).toBeVisible();
  const width = (await alert.boundingBox())!.width;
  expect(width).toBeLessThanOrEqual(360);
  await navigate(page, "Evidencias");
  await expect(page.getByRole("button", { name: /^Descargar / })).toHaveCount(1);
  await page.route("**/api/evidence?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "EVD-002",
            projectId: "1",
            name: "captura.png",
            type: "Imagen",
            related: [],
            sizeBytes: 10,
            createdAt: stamp,
            hasFile: true,
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Descargar captura.png", exact: true }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
});

for (const kind of ["bug", "case", "run"] as const) {
  test(`Mis menciones abre el ${kind} mencionado y lo marca leído`, async ({ page, workspace }) => {
    workspace.runs.push({
      id: "RUN-001",
      projectId: "1",
      title: "Smoke",
      owner: "QA",
      status: "En curso",
      tagIds: [],
      caseIds: [],
      caseCount: 0,
      progress: 0,
      results: [],
      createdAt: stamp,
    });
    const id = kind === "bug" ? "BUG-001" : kind === "case" ? "TC-001" : "RUN-001";
    let read = false;
    await page.route("**/api/mention-notifications**", async (route) => {
      if (route.request().method() === "PATCH") {
        read = true;
        await route.fulfill({ status: 204 });
      } else
        await route.fulfill({
          json: {
            data: [
              {
                id: "NTF-001",
                commentId: "CMT-001",
                target: { kind, id },
                authorName: "QA Local",
                createdAt: stamp,
                readAt: read ? stamp : null,
              },
            ],
          },
        });
    });
    await page.goto("/");
    await navigate(page, "Mis menciones");
    await expect(page.getByText(`QA Local te mencionó en ${id}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Abrir registro", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(read).toBe(false);
    await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
    await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
    await expect.poll(() => read).toBe(true);
    await noHorizontalOverflow(page);
  });
}
