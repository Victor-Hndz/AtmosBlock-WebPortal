import { expect, test } from "@playwright/test";
import { ANONIMO, SESION, es, menuUsuario, nuevoEmail, usuario } from "./soporte";

// Sin reintentos: cada intento consume peticiones del límite de auth (5/min).
test.describe.configure({ retries: 0 });

test.describe("registro", () => {
  test.use({ storageState: ANONIMO });

  test("registrarse desde el formulario inicia la sesión", async ({ page }) => {
    const clave = "Clave-E2e-2026!";
    await page.goto("/auth");

    await page.getByRole("tab", { name: es["register-form"].title }).click();
    await page.getByLabel(es["register-form"].name, { exact: true }).fill("Registro E2E");
    await page.getByLabel(es["register-form"].email, { exact: true }).fill(nuevoEmail());
    await page.getByLabel(es["login-form"].password, { exact: true }).fill(clave);
    await page.getByLabel(es["register-form"].confirmPassword, { exact: true }).fill(clave);
    await page.getByRole("button", { name: es["register-form"]["register-button"] }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(menuUsuario(page)).toBeVisible();
  });
});

test.describe("sesión existente", () => {
  test.use({ storageState: SESION });

  test("cerrar sesión y volver a entrar con el usuario de prueba", async ({ page }) => {
    const { email, password } = usuario();
    await page.goto("/");

    await menuUsuario(page).click();
    await page.getByRole("menuitem", { name: es.profile.logout }).click();
    await expect(page.getByRole("link", { name: es["navigation-header"].login, exact: true })).toBeVisible();

    await page.goto("/auth");
    await page.getByLabel(es["login-form"].email, { exact: true }).fill(email);
    await page.getByLabel(es["login-form"].password, { exact: true }).fill(password);
    await page.getByRole("button", { name: es["login-form"]["login-button"], exact: true }).click();

    await expect(menuUsuario(page)).toBeVisible();
  });
});
