import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
import type { DesignTemplates } from "../../backend/src/models/design-templates.model";

test("guarda plantillas con tags y responsable y las aplica en los diseñadores", async ({
  page,
  workspace,
}) => {
  let document: DesignTemplates = { revision: 0, cases: [], bugDefaults: [] };
  const stamp = "2026-11-05T12:00:00Z";
  await page.route("**/api/design-templates?*", async (route) => {
    if (route.request().method() === "PUT") {
      const input = route.request().postDataJSON() as DesignTemplates;
      expect(input.revision).toBe(document.revision);
      document = { ...input, revision: input.revision + 1 };
    }
    await route.fulfill({ json: { data: document } });
  });
  await page.route("**/api/auth/bug-templates", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "1",
            name: "Incidencia de acceso",
            title: "[Login]",
            description: "",
            priority: "Alta",
            createdAt: stamp,
          },
        ],
      },
    }),
  );
  await page.route("**/api/tags?*", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "2", name: "Smoke de acceso", projectId: "1", color: "#16754b", createdAt: stamp },
        ],
      },
    }),
  );
  await page.goto("/");
  await navigate(page, "Configuración");
  await page.getByRole("button", { name: "Plantillas", exact: true }).click();
  await page.getByRole("combobox", { name: "Plantilla de bug", exact: true }).selectOption("1");
  await page.getByLabel("Responsable predeterminado").selectOption("1");
  await page.getByRole("checkbox", { name: "Smoke de acceso" }).check();
  await page.getByRole("button", { name: "Guardar tags y responsable" }).click();
  await expect(page.getByText("Valores de la plantilla de bug guardados.")).toBeVisible();
  await page.getByRole("button", { name: "Plantillas de casos de prueba", exact: true }).click();
  await page.getByLabel("Nombre de la plantilla de caso").fill("Smoke del portal");
  await page.getByLabel("Título del caso").fill("Validar inicio de sesión");
  await page.getByLabel("Tipo de prueba", { exact: true }).fill("Smoke");
  await page.getByLabel("Acción", { exact: true }).fill("Abrir el portal");
  await page.getByLabel("Resultado esperado", { exact: true }).fill("Se muestra el formulario");
  await page.getByLabel("Responsable predeterminado").selectOption("1");
  await page.getByRole("checkbox", { name: "Smoke de acceso" }).check();
  await page.getByRole("button", { name: "Guardar plantilla de caso" }).click();
  await expect(page.getByText("Plantilla de caso guardada.")).toBeVisible();
  await page.reload();
  await navigate(page, "Diseñar test cases");
  await page
    .getByRole("combobox", { name: "Plantilla de caso", exact: true })
    .selectOption({ label: "Smoke del portal" });
  await page.getByRole("button", { name: "Preparar caso", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue(
    "Validar inicio de sesión",
  );
  await expect(dialog.getByLabel("Acción", { exact: true })).toHaveValue("Abrir el portal");
  await expect(dialog.getByLabel("Responsable QA")).toHaveValue("1");
  await expect(dialog.getByRole("checkbox", { name: "Smoke de acceso" })).toBeChecked();
  expect(workspace.writes.some(({ path }) => path === "/test-cases")).toBe(false);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(workspace.writes.find(({ path }) => path === "/test-cases")?.body).toMatchObject({
    title: "Validar inicio de sesión",
    assigneeUserId: "1",
    tagIds: ["2"],
  });
  await navigate(page, "Diseñar bugs");
  await page.getByLabel("Problema observado").fill("El formulario no responde");
  await page.getByLabel("Plantilla de bug").selectOption("1");
  await page.getByRole("button", { name: "Preparar bug", exact: true }).click();
  await expect(page.getByLabel("Responsable QA")).toHaveValue("1");
  await expect(page.getByRole("checkbox", { name: "Smoke de acceso" })).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Revisé el contenido y confirmo la creación del bug." })
    .check();
  await page.getByRole("button", { name: "Guardar en Bugs" }).click();
  await expect(page.getByText("Bug BUG-002 guardado en Bugs.")).toBeVisible();
  expect(workspace.writes.find(({ path }) => path === "/bugs")?.body).toMatchObject({
    assigneeUserId: "1",
    tagIds: ["2"],
  });
  await noHorizontalOverflow(page);
});
