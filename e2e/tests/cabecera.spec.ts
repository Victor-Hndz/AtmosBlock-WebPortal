import { expect, test, type Page } from "@playwright/test";
import { botonIdioma, en, es, estadoNavegador, menuUsuario } from "./soporte";

// Sin API: la sesión del frontend vive en localStorage (authSlice) y la cabecera no pide nada al cargar.
const SESION_SIMULADA = estadoNavegador({
  i18nextLng: "es",
  token: "token-simulado",
  auth: JSON.stringify({
    user: { id: "e2e-cabecera", name: "Víctor Hernández", email: "victor@example.com" },
    isAuthenticated: true,
  }),
});
const MOVIL = { width: 375, height: 812 };

const selectorIdiomaMovil = (page: Page) =>
  page.getByRole("button", { name: es.language.switchLanguage }).filter({ visible: true });

const bienvenida = (nombre: string) => es["navigation-header"].welcome.replace("{{nombre}}", nombre);

test.describe("sin sesión", () => {
  test.use({ storageState: estadoNavegador({ i18nextLng: "es" }) });

  test("el idioma elegido se conserva al recargar (WEB-360)", async ({ page }) => {
    await page.goto("/");
    await botonIdioma(page).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: en.home.hero.title })).toBeVisible();

    await page.reload();

    await expect(page.getByRole("heading", { name: en.home.hero.title })).toBeVisible();
    await expect(botonIdioma(page, en)).toHaveText("EN");
    expect(await page.evaluate(() => localStorage.getItem("i18nextLng"))).toBe("en");
  });
});

test.describe("con sesión", () => {
  test.use({ storageState: SESION_SIMULADA });

  test.describe("en móvil", () => {
    test.use({ viewport: MOVIL });

    test("la cabecera muestra el selector de idioma y el avatar (WEB-312)", async ({ page }) => {
      await page.goto("/");

      await expect(menuUsuario(page)).toBeVisible();
      // Un solo «Cambiar idioma»: la hamburguesa se llamaba igual que el selector.
      await expect(selectorIdiomaMovil(page)).toHaveCount(1);
      await expect(selectorIdiomaMovil(page)).toHaveText("ES");
      await expect(page.getByRole("button", { name: es["navigation-header"].menu })).toBeVisible();
    });

    test("no muestra la bienvenida, que no cabe (WEB-311)", async ({ page }) => {
      await page.goto("/");

      await expect(menuUsuario(page)).toBeVisible();
      await expect(page.getByText(bienvenida("Víctor"))).toBeHidden();
    });
  });

  test("en escritorio da la bienvenida solo con el nombre de pila (WEB-311)", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation").getByText(bienvenida("Víctor"), { exact: true })).toBeVisible();
  });

  test("el avatar y el selector de idioma tienen tooltip (WEB-309)", async ({ page }) => {
    await page.goto("/");

    await menuUsuario(page).hover();
    await expect(page.getByRole("tooltip")).toHaveText(es["navigation-tooltips"].profile);

    await botonIdioma(page).hover();
    await expect(page.getByRole("tooltip")).toHaveText(es["navigation-tooltips"].language);
  });

  test("el tooltip no impide abrir los menús, no reaparece al cerrarlos y sí sale con Tab (WEB-309)", async ({ page }) => {
    await page.goto("/");

    await menuUsuario(page).click();
    await expect(page.getByRole("menuitem", { name: es.profile.logout })).toBeVisible();
    await page.keyboard.press("Escape");

    await botonIdioma(page).click();
    await page.getByRole("menuitem", { name: "English" }).click();
    // Al cerrarse, el menú devuelve el foco al botón: con el ratón lejos, el tooltip no debe abrirse.
    await page.mouse.move(600, 500);
    await expect(botonIdioma(page, en)).toBeFocused();
    await page.waitForTimeout(600); // más que el delayDuration de 300 ms
    await expect(page.getByRole("tooltip")).toHaveCount(0);

    // Con el teclado sí aparece: Tab desde el avatar al selector de idioma.
    await page.getByRole("button", { name: en.profile.userMenu }).filter({ visible: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tooltip")).toHaveText(en["navigation-tooltips"].language);
  });

  test("el avatar se ilumina con un halo al pasar el ratón (WEB-306)", async ({ page }) => {
    await page.goto("/");

    await expect(menuUsuario(page)).toHaveClass(/hover:ring-/);
  });

  test("los menús de perfil e idioma se abren con la misma animación (WEB-307)", async ({ page }) => {
    await page.goto("/");

    await menuUsuario(page).click();
    await expect(page.getByRole("menu")).toHaveClass(/\banimate-in\b/);
    await page.keyboard.press("Escape");

    await botonIdioma(page).click();
    await expect(page.getByRole("menu")).toHaveClass(/\banimate-in\b/);
  });
});
