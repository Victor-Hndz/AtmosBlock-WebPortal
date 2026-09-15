import { expect, test } from "@playwright/test";
import { SESION, es } from "./soporte";

test.use({ storageState: SESION });

// WEB-213: la API envía en `increment` el progreso ACUMULADO de la petición (0-100), no un incremento.
// Se simula el stream para comprobar lo que muestra la página sin lanzar el pipeline.
test("la barra de progreso muestra el progreso acumulado que envía la API, sin volver a sumarlo", async ({ page }) => {
  const hash = "e2e-progreso";
  await page.route(`**/api/progress/stream-url/${hash}`, route =>
    route.fulfill({ json: { url: `/progress/stream/${hash}?expires=1&sig=simulada` } })
  );
  await page.route(`**/api/progress/stream/${hash}*`, route =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      // retry alto: que el navegador no reconecte y repita los eventos durante la prueba
      body: ["retry: 60000", ...[4, 8, 12].map(p => `data: ${JSON.stringify({ increment: p, message: `paso ${p}` })}`)]
        .map(linea => `${linea}\n\n`)
        .join(""),
    })
  );

  await page.goto(`/results?requestHash=${hash}`);

  await expect(page.getByText("paso 12")).toBeVisible();
  await expect(page.getByRole("heading", { name: es.results.processStatus }).locator("..")).toContainText("12%");
});
