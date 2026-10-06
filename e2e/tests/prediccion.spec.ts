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

const primario = (modelo: string, sector: string, bss: number, habilidad: boolean) =>
  Array.from({ length: 15 }, (_, i) => ({ modelo, sector, paso: i + 1, bss, ic90: [bss - 0.2, bss + 0.2], habilidad }));
const SIN_REGISTROS = { pasadas: {} };
const CON_REGISTROS = {
  pasadas: { ifs: 30, aifs: 30 },
  pasadas_completas: { ifs: 28, aifs: 28 },
  primario: [...primario("ifs", "EA", 0.42, true), ...primario("ifs", "PA", -0.05, false)],
};

async function simularPages(page: Page, pedidas: string[] = [], verificacion: object = SIN_REGISTROS) {
  await page.route("**/prediccion/verificacion.json", r => r.fulfill({ json: verificacion }));
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
  // el visor público incrustado pediría los mismos JSON que el portal (y saldría a la red)
  await page.route(/\/AtmosBlock-WebPortal\/\?embed=1/, r =>
    r.fulfill({ contentType: "text/html", body: "<p>visor</p>" })
  );
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
  await page.waitForLoadState("networkidle"); // también lo que pida el iframe del visor
  expect(pedidas).toEqual(["ifs/20260930", "aifs/20260930", "ifs/20260930", "ifs/20260929"]);
});

test("«Previsión» aparece en la navegación", async ({ page }) => {
  await simularPages(page);
  await page.goto("/");

  await page.getByRole("link", { name: es["navigation-header"].prediccion }).click();
  await expect(page).toHaveURL(/\/prediccion$/);
});

test("sin registros, la verificación dice cuándo empieza", async ({ page }) => {
  await simularPages(page);
  await page.goto("/prediccion");

  await expect(page.getByRole("heading", { name: t.verificacion.titulo })).toBeVisible();
  await expect(page.getByText(t.verificacion.pendiente)).toBeVisible();
});

test("con registros, la verificación muestra el BSS primario y marca la habilidad", async ({ page }) => {
  await simularPages(page, [], CON_REGISTROS);
  await page.goto("/prediccion");

  const tabla = page.getByRole("table", { name: t.verificacion.titulo });
  const ea = tabla.getByRole("row", { name: new RegExp(`IFS ENS.*${t.sectores.EA}`) });
  await expect(ea.getByRole("cell").first()).toHaveText("0.42*");
  const pa = tabla.getByRole("row", { name: new RegExp(`IFS ENS.*${t.sectores.PA}`) });
  await expect(pa.getByRole("cell").first()).toHaveText("-0.05");
  await expect(page.getByText(t.verificacion.habilidad)).toBeVisible();
  await expect(
    page.getByText(t.verificacion.pasadas.replace("{{completas}}", "28").replace("{{total}}", "30")).first()
  ).toBeVisible();
});

test("la previsión de un vistazo incrusta el visor público con el modelo y la pasada elegidos", async ({ page }) => {
  await simularPages(page);
  await page.goto("/prediccion");

  await expect(page.getByRole("heading", { name: t.vistazo.titulo })).toBeVisible();
  const visor = page.getByTitle(t.vistazo.iframe);
  await expect(visor).toHaveAttribute("src", /\?embed=1&modelo=ifs&fecha=20260930&lang=es$/);
  await expect(page.getByRole("link", { name: t.vistazo.abrir })).toHaveAttribute("href", /AtmosBlock-WebPortal\/$/);
  await expect(page.getByRole("heading", { name: t.detalle })).toBeVisible();

  await page.getByLabel(t.modelo).selectOption("aifs");
  await expect(visor).toHaveAttribute("src", /modelo=aifs&fecha=20260930&lang=es$/);
});
