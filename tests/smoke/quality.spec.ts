import { randomUUID } from "node:crypto";
import { test, expect, type APIResponse } from "@playwright/test";

async function data<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `${response.status()} ${response.url()}`).toBeTruthy();
  return (await response.json()).data as T;
}

test("login, fallo, bug y evidencia privada con API y PostgreSQL reales", async ({
  page,
  playwright,
  baseURL,
}) => {
  const owner = await playwright.request.newContext({ baseURL });
  const outsider = await playwright.request.newContext({ baseURL });
  const password = "ephemeral browser smoke password";
  const email = `${randomUUID()}@example.test`;
  try {
    await data(
      await owner.post("/api/auth/register", { data: { email, password, name: "QA Smoke" } }),
    );
    await data(
      await outsider.post("/api/auth/register", {
        data: {
          email: `${randomUUID()}@example.test`,
          password,
          name: "QA Externo",
        },
      }),
    );
    await page.goto("/");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Entrar al workspace/ }).click();
    await expect(page.getByRole("button", { name: "Salir", exact: true })).toBeVisible();
    const { csrfToken } = await data<{ csrfToken: string }>(await page.request.get("/api/auth/me"));
    const headers = { "X-CSRF-Token": csrfToken };
    const [project] = await data<{ id: string }[]>(await page.request.get("/api/projects"));
    const projectId = project.id;
    const tc = await data<{ id: string }>(
      await page.request.post("/api/test-cases", {
        headers,
        data: {
          projectId,
          title: "Validar acceso",
          steps: [{ action: "Entrar", expectedResult: "Acceso correcto" }],
        },
      }),
    );
    const run = await data<{ id: string; results: { id: string }[] }>(
      await page.request.post("/api/test-runs", {
        headers,
        data: { projectId, title: "Smoke de calidad", owner: "QA", caseIds: [tc.id] },
      }),
    );
    await page.goto(`/?project=${projectId}&record=${run.id}`);
    const dialog = page.getByRole("dialog");
    await dialog.locator('select[name="status"]').selectOption("failed");
    await dialog.getByLabel("Notas").fill("El acceso devuelve un error.");
    await dialog.getByRole("button", { name: "Guardar resultado" }).click();
    await expect(dialog.getByText("Registrado: Fallido")).toBeVisible();

    const bytes = Buffer.from("evidencia privada de smoke");
    const uploaded = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().includes("/api/evidence/upload"),
    );
    await dialog.getByLabel(`Adjuntar evidencia a ${run.results[0].id}`).setInputFiles({
      name: "smoke.txt",
      mimeType: "text/plain",
      buffer: bytes,
    });
    const upload = await uploaded;
    expect(upload.status()).toBe(201);
    const { id: evidenceId } = (await upload.json()).data as { id: string };
    await expect(
      dialog.getByRole("button", { name: "Descargar evidencia", exact: true }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Crear bug desde este fallo" }).click();
    const created = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/api/bugs",
    );
    await dialog.getByRole("button", { name: "Confirmar creación del bug" }).click();
    const bugResponse = await created;
    expect(bugResponse.status()).toBe(201);
    const bug = (await bugResponse.json()).data as { id: string; sourceResultId: string };
    expect(bug.sourceResultId).toBe(run.results[0].id);

    const evidence = await data<{ id: string; related: string[] }[]>(
      await page.request.get(`/api/evidence?projectId=${projectId}`),
    );
    expect(evidence.find(({ id }) => id === evidenceId)?.related).toEqual(
      expect.arrayContaining([run.results[0].id, bug.id]),
    );
    const file = `/api/evidence/${evidenceId}/file?projectId=${projectId}`;
    const download = await page.request.get(file);
    expect(download.ok()).toBeTruthy();
    expect(await download.body()).toEqual(bytes);
    expect((await outsider.get(file)).status()).toBe(404);
  } finally {
    await Promise.all([owner.dispose(), outsider.dispose()]);
  }
});
