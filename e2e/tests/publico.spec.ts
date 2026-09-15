import { expect, test } from "@playwright/test";
import { ANONIMO, botonIdioma, en, es } from "./soporte";

test.use({ storageState: ANONIMO });

test("la portada carga en español con el título del portal", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/AtmosBlock/);
  await expect(page.getByRole("heading", { name: es.home.hero.title })).toBeVisible();
});

test("el pie muestra los años hasta el actual, el autor y la licencia MIT (WEB-223)", async ({ page }) => {
  await page.goto("/");

  const anio = new Date().getFullYear();
  const pie = page.getByRole("contentinfo");
  await expect(pie).toContainText(new RegExp(`© ${anio > 2025 ? `2025[–-]${anio}` : "2025"} Víctor Hernández`));
  await expect(pie.getByRole("link", { name: es["navigation-footer"].license })).toHaveAttribute(
    "href",
    "https://github.com/Victor-Hndz/AtmosBlock-WebPortal/blob/main/LICENSE"
  );
});

test("«Acerca de» enlaza al repositorio del proyecto (WEB-223)", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("link", { name: es.about.links.github })).toHaveAttribute(
    "href",
    "https://github.com/Victor-Hndz/AtmosBlock-WebPortal"
  );
});

test("el selector de idioma cambia a inglés y vuelve a español", async ({ page }) => {
  await page.goto("/");

  await botonIdioma(page).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: en.home.hero.title })).toBeVisible();

  await botonIdioma(page, en).click();
  await page.getByRole("menuitem", { name: "Español" }).click();
  await expect(page.getByRole("heading", { name: es.home.hero.title })).toBeVisible();
});

test("abrir el menú de idioma no bloquea el scroll ni desplaza cabecera y pie (WEB-223)", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: es.about.title })).toBeVisible();
  const anchos = () =>
    page.evaluate(() => ({
      cabecera: document.querySelector("nav")?.getBoundingClientRect().width,
      pie: document.querySelector("footer")?.getBoundingClientRect().width,
    }));
  const antes = await anchos();

  await botonIdioma(page).click();

  await expect(page.getByRole("menu")).toBeVisible();
  // Un menú modal de Radix marca el body con data-scroll-locked y oculta la barra de scroll.
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  expect(await anchos()).toEqual(antes);
});

test("una ruta inexistente muestra la página 404", async ({ page }) => {
  await page.goto("/no-existe");

  await expect(page.getByRole("heading", { name: es.notFound.title })).toBeVisible();
});

test("sin sesión, el formulario de solicitudes pide iniciar sesión", async ({ page }) => {
  await page.goto("/requests");

  await expect(page.getByRole("heading", { name: es["requests-titles"].title })).toBeVisible();
  await expect(page.getByText(es["requests-form"].loginRequired)).toBeVisible();
});

test("sin sesión, el perfil redirige a la autenticación", async ({ page }) => {
  await page.goto("/profile");

  await expect(page).toHaveURL(/\/auth$/);
});
