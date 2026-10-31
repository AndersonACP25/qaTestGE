import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
import type { ProjectMember } from "../../backend/src/models/collaboration.model";

test("Admin agrega, consulta, edita y retira usuarios del proyecto", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  let members: ProjectMember[] = [
    { id: "1", name: "QA Local", role: "Admin", owner: false, revision: 1 },
    { id: "2", name: "Ana Pruebas", role: null, owner: false, revision: 0 },
    { id: "9", name: "Propietario", role: "Admin", owner: true, revision: 0 },
  ];
  const writes: { role: string | null; revision: number }[] = [];
  let assigned = true;
  await page.route("**/api/project-members**", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (body.role === null && assigned) {
        await route.fulfill({
          status: 409,
          json: {
            error: {
              code: "MEMBER_ASSIGNED",
              message: "Reasigna sus bugs y casos antes de retirar el acceso.",
            },
          },
        });
        return;
      }
      members = members.map((m) =>
        m.id === "2" ? { ...m, role: body.role, revision: m.revision + 1 } : m,
      );
      await route.fulfill({ status: 204 });
    } else await route.fulfill({ json: { data: members } });
  });
  await page.goto("/");
  await expect(page.locator(".nav-group").first().locator("button").first()).toContainText(
    "Dashboard",
  );
  await expect(
    page.locator(".sidebar-nav").getByRole("button", { name: "Accesos al proyecto", exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Accesos al proyecto");
  await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Usuario del equipo", exact: true }).selectOption("2");
  await page.getByRole("combobox", { name: "Rol inicial", exact: true }).selectOption("Dev");
  await page.getByRole("button", { name: "Agregar usuario", exact: true }).click();
  const row = page.getByRole("article", { name: "Acceso de Ana Pruebas", exact: true });
  await expect(row.locator(".role-badge")).toHaveText("Dev");
  await expect(
    page.getByText("Acceso de Ana Pruebas agregado como Dev.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Acceso de Propietario", exact: true }).getByRole("button"),
  ).toHaveCount(0);
  await row.getByRole("button", { name: "Editar rol", exact: true }).click();
  await page.getByRole("combobox", { name: "Rol de Ana Pruebas", exact: true }).selectOption("QA");
  await page.getByRole("button", { name: "Guardar rol", exact: true }).click();
  await expect(row.locator(".role-badge")).toHaveText("QA");
  await row.getByRole("button", { name: "Retirar acceso", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar retiro", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Reasigna sus bugs");
  await expect(row).toBeAttached();
  assigned = false;
  await page.getByRole("button", { name: "Confirmar retiro", exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(
    page.getByText("Acceso de Ana Pruebas retirado de este proyecto.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("combobox", { name: "Usuario del equipo", exact: true })
      .getByRole("option", { name: "Ana Pruebas · #2", exact: true }),
  ).toHaveCount(1);
  expect(writes).toEqual([
    { role: "Dev", revision: 0 },
    { role: "QA", revision: 1 },
    { role: null, revision: 2 },
    { role: null, revision: 2 },
  ]);
  await page.screenshot({ path: testInfo.outputPath("accesos-configuracion.png"), fullPage: true });
  await noHorizontalOverflow(page);
});

test("un guardado tardío de accesos no contamina otro proyecto", async ({ page, workspace }) => {
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
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/project-members**", async (route) => {
    if (route.request().method() === "PUT") {
      started();
      await pending;
      await route.fulfill({ status: 204 });
      return;
    }
    const projectId = new URL(route.request().url()).searchParams.get("projectId");
    await route.fulfill({
      json: {
        data: [
          { id: "1", name: "QA Local", role: "Admin", owner: true, revision: 0 },
          ...(projectId === "1"
            ? [{ id: "2", name: "Usuario de A", role: null, owner: false, revision: 0 }]
            : []),
        ],
      },
    });
  });
  await page.goto("/");
  await navigate(page, "Accesos al proyecto");
  await page.getByRole("combobox", { name: "Usuario del equipo", exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Agregar usuario", exact: true }).click();
  await requested;
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  await expect(page.getByText("Proyecto B", { exact: true }).last()).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes("/project-members/2"),
  );
  release();
  await response;
  await expect(page.getByText(/Usuario de A/)).toHaveCount(0);
  await expect(page.getByText(/agregado como/)).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test("Dashboard presenta cero sin datos y separa títulos y contenido", async ({
  page,
  workspace,
}, testInfo) => {
  void workspace;
  await page.goto("/");
  await expect(
    page
      .locator(".dashboard-view .workspace__metric")
      .filter({ hasText: "Aprobación" })
      .locator("strong"),
  ).toHaveText("0%");
  await expect(page.locator(".dashboard-view .analytics__empty")).toHaveText("0");
  await expect(page.locator(".dashboard-view").getByText(/Sin datos/)).toHaveCount(0);
  const panel = page.locator(".dashboard-view .workspace__panel");
  expect(
    parseFloat(await panel.evaluate((e) => getComputedStyle(e).rowGap)),
  ).toBeGreaterThanOrEqual(16);
  const h = await panel.getByRole("heading").boundingBox();
  const p = await panel.locator("p").boundingBox();
  expect(p!.y - (h!.y + h!.height)).toBeGreaterThanOrEqual(16);
  await navigate(page, "Configuración");
  const card = page.locator(".account-settings__card:visible").first();
  expect(parseFloat(await card.evaluate((e) => getComputedStyle(e).rowGap))).toBeGreaterThanOrEqual(
    16,
  );
  await navigate(page, "Dashboard");
  await page.screenshot({
    path: testInfo.outputPath("dashboard-cero-espaciado.png"),
    fullPage: true,
  });
  await noHorizontalOverflow(page);
});
