import { test, expect } from "@playwright/test";

test("solicita acceso por correo y usa el token sin conservarlo en la URL", async ({ page }) => {
  const token = "b".repeat(64);
  const password = "valid replacement password";
  const requests: unknown[] = [];
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      await route.fulfill({
        status: 401,
        json: { error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } },
      });
    } else if (path === "/api/auth/account-links") {
      await route.fulfill({ json: { data: { enabled: true } } });
    } else {
      requests.push(route.request().postDataJSON());
      const requesting = path.endsWith("/request");
      await route.fulfill({
        status: requesting ? 202 : 200,
        json: { data: requesting ? { accepted: true } : { completed: true } },
      });
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: /necesitas activar tu cuenta/ }).click();
  await page.getByLabel("Correo electrónico").fill("qa@example.test");
  await page.getByRole("button", { name: "Solicitar enlace" }).click();
  await expect(page.getByText(/Si hay una cuenta disponible/)).toBeVisible();

  await page.goto(`/?account-test=1#account-link=${token}`);
  await expect(page.getByRole("heading", { name: "Define tu contraseña" })).toBeVisible();
  await expect(page).toHaveURL(/\/\?account-test=1$/);
  await page.getByLabel("Nueva contraseña").fill(password);
  await page.getByLabel("Confirmar contraseña").fill(password);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText(/Contraseña guardada/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
  expect(requests).toEqual([{ email: "qa@example.test" }, { token, password }]);
});
