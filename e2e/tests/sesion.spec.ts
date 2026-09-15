import { expect, test } from "@playwright/test";
import { SESION, es, usuario } from "./soporte";

test.use({ storageState: SESION });

test("con sesión, el formulario de solicitudes no pide iniciar sesión", async ({ page }) => {
  await page.goto("/requests");

  await expect(page.getByRole("heading", { name: es["requests-titles"].title })).toBeVisible();
  await expect(page.getByText(es["requests-form"].loginRequired)).toHaveCount(0);
});

test("el perfil muestra los datos del usuario", async ({ page }) => {
  const { email } = usuario();
  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: es.profile.profile })).toBeVisible();
  await expect(page.getByText(email).or(page.locator(`input[value="${email}"]`)).first()).toBeVisible();
});

test("un usuario nuevo no tiene solicitudes anteriores", async ({ page }) => {
  await page.goto("/previous-requests");

  await expect(page.getByText(es.settings.noRequests)).toBeVisible();
});
