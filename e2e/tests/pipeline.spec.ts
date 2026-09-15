import { expect, test } from "@playwright/test";
import { API, SESION, es, usuario } from "./soporte";

/**
 * Pipeline completo sin el CDS: el configurador no descarga si el fichero ya está en su volumen.
 * Antes de lanzarlo, copiar el caso de ejemplo con el nombre que genera para esta petición:
 *
 *   docker compose cp backend/FAST-IBAN_Project/execution/code/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc \
 *     "configurator_module:/app/config/data/geopotential_500hPa_2022-03-(14)_00-06-12-18UTC.nc"
 */
const PETICION_CASO_EJEMPLO = {
  variableName: "geopotential",
  pressureLevels: ["500"],
  years: ["2022"],
  months: ["03"],
  days: ["14"],
  hours: ["0", "6", "12", "18"],
  areaCovered: ["90", "-180", "0", "180"],
  mapTypes: ["cont"],
  fileFormat: "svg",
};

test.use({ storageState: SESION });

const lanzar = async (request: import("@playwright/test").APIRequestContext) => {
  const respuesta = await request.post(`${API}/requests/process`, {
    data: PETICION_CASO_EJEMPLO,
    headers: { Authorization: `Bearer ${usuario().token}` },
  });
  expect(respuesta.status(), await respuesta.text()).toBe(201);
  const cuerpo = await respuesta.json();
  return typeof cuerpo === "string" ? JSON.parse(cuerpo) : cuerpo;
};

test("una petición recorre descarga, núcleo en C y mapas, y la página de resultados la muestra", async ({
  page,
  request,
}) => {
  const { requestHash } = await lanzar(request);

  await page.goto(`/results?requestHash=${requestHash}`);

  await expect(page.getByText(es.results.complete)).toBeVisible({ timeout: 15 * 60_000 });
  await expect(page.getByText(es.results.fileList)).toBeVisible();
  await expect(page.getByText(/_formations_.*\.csv$/)).toBeVisible();
  await expect(page.getByText(/^map_geopotential_cont_.*\.svg$/)).toHaveCount(4);
  await expect(page.getByRole("button", { name: es.results.downloadAll })).toBeVisible();

  // La misma petición se sirve desde la caché.
  expect((await lanzar(request)).status).toBe("CACHED");
});
