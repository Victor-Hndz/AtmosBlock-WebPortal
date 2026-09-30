import { expect, test, type Page } from "@playwright/test";
import { ANONIMO, es } from "./soporte";

// PRD-402: la página lee el índice y el JSON diario de GitHub Pages (PRD-401); aquí se simulan con page.route.
test.use({ storageState: ANONIMO });

const t = es.prediccion;
const PNG = "https://github.com/dueno/repo/releases/download/producto-ens-{aaaa}-{mm}/producto_{modelo}_{fecha}.png";
const ATRIBUCION = "Contains modified ECMWF open data, CC-BY-4.0";

const sector = (p: number, calma = false, prob_inicio = { dias_1_5: null, dias_6_10: null }, aviso: string[] = []) => ({
  probabilidad: Array.from({ length: 16 }, () => p),
  calma,
  prob_inicio,
  aviso_inicio: aviso,
});

const producto = (modelo: string, fecha: string, ea: number, historia_incompleta = false) => ({
  modelo,
  fecha,
  historia_incompleta,
  atribucion: ATRIBUCION,
  sectores: {
    GRL: sector(0.1, true, { dias_1_5: 0.62, dias_6_10: 0.2 }, ["dias_1_5"]),
    EA: sector(ea),
    URA: sector(0),
    PA: sector(0),
    NAM: sector(0),
    "LLB-Atl": sector(0.9),
    "LLB-Pac": sector(0.8),
  },
});

async function simularPages(page: Page, pedidas: string[] = []) {
  await page.route("**/prediccion/index.json", r =>
    r.fulfill({
      json: {
        modelos: { ifs: ["20260929", "20260930"], aifs: ["20260930"] },
        png: PNG,
        atribucion: ATRIBUCION,
      },
    })
  );
  await page.route(/\/prediccion\/(ifs|aifs)\/\d{8}\.json$/, r => {
    const [, modelo, fecha] = r
      .request()
      .url()
      .match(/\/(ifs|aifs)\/(\d{8})\.json$/)!;
    pedidas.push(`${modelo}/${fecha}`);
    r.fulfill({
      json: producto(modelo, fecha, modelo === "ifs" ? 0.74 : 0.31, fecha === "20260929"),
    });
  });
  await page.route("**/releases/download/**", r => r.fulfill({ status: 200, contentType: "image/png", body: "" }));
}

test("la previsión muestra la última pasada con la tabla por sector, el aviso experimental y la atribución", async ({
  page,
}) => {
  await simularPages(page);
  await page.goto("/prediccion");

  await expect(page.getByRole("heading", { name: t.titulo })).toBeVisible();
  await expect(page.getByRole("note")).toHaveText(t.experimental);
  const ea = page.getByRole("row", { name: new RegExp(t.sectores.EA) });
  await expect(ea.getByRole("cell").first()).toHaveText("74 %");
  await expect(page.getByRole("rowgroup").filter({ hasText: t.bajaLatitud })).toContainText("90 %");
  await expect(page.getByText(`${t.ventanas.dias_1_5} 62 % (${t.aviso})`)).toBeVisible();
  await expect(page.getByRole("img")).toHaveAttribute(
    "src",
    "https://github.com/dueno/repo/releases/download/producto-ens-2026-09/producto_ifs_20260930.png"
  );
  await expect(page.getByText(ATRIBUCION)).toBeVisible();
  await expect(page.getByText(t.historiaIncompleta)).toHaveCount(0);
});

test("cambiar de modelo y de pasada carga su JSON y marca la historia incompleta", async ({ page }) => {
  const pedidas: string[] = [];
  await simularPages(page, pedidas);
  await page.goto("/prediccion");

  await page.getByLabel(t.modelo).selectOption("aifs");
  await expect(
    page
      .getByRole("row", { name: new RegExp(t.sectores.EA) })
      .getByRole("cell")
      .first()
  ).toHaveText("31 %");

  await page.getByLabel(t.modelo).selectOption("ifs");
  await page.getByLabel(t.fecha).selectOption("20260929");
  await expect(page.getByText(t.historiaIncompleta)).toBeVisible();
  expect(pedidas).toEqual(["ifs/20260930", "aifs/20260930", "ifs/20260930", "ifs/20260929"]);
});

test("«Previsión» aparece en la navegación", async ({ page }) => {
  await simularPages(page);
  await page.goto("/");

  await page.getByRole("link", { name: es["navigation-header"].prediccion }).click();
  await expect(page).toHaveURL(/\/prediccion$/);
});
