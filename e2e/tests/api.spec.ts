import { expect, test } from "@playwright/test";
import { API, FRONT, PETICION, usuario } from "./soporte";

const autorizacion = () => ({ Authorization: `Bearer ${usuario().token}` });

test("health responde 200 con la base de datos (WEB-206)", async ({ request }) => {
  const respuesta = await request.get(`${API}/health`);

  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toMatchObject({ status: "ok", database: "up" });
});

test("cabeceras de seguridad de helmet (WEB-203)", async ({ request }) => {
  const cabeceras = (await request.get(`${API}/health`)).headers();

  expect(cabeceras["x-content-type-options"]).toBe("nosniff");
  expect(cabeceras["content-security-policy"]).toContain("default-src 'self'");
  expect(cabeceras["content-security-policy"]).toContain(`frame-ancestors 'self' ${FRONT}`);
});

test("CORS solo permite el origen del frontend (WEB-202)", async ({ request }) => {
  const permitido = await request.get(`${API}/health`, { headers: { Origin: FRONT } });
  const ajeno = await request.get(`${API}/health`, { headers: { Origin: "http://malicioso.example" } });

  expect(permitido.headers()["access-control-allow-origin"]).toBe(FRONT);
  expect(ajeno.headers()["access-control-allow-origin"]).toBeUndefined();
});

test("Swagger UI carga fuera de producción y sin violaciones de la CSP (WEB-204)", async ({ page }) => {
  const violaciones: string[] = [];
  page.on("console", mensaje => {
    if (mensaje.text().includes("Content Security Policy")) violaciones.push(mensaje.text());
  });

  await page.goto(`${API}/docs`);

  await expect(page.getByText("/api/health").first()).toBeVisible();
  expect(violaciones).toEqual([]);
});

test("lanzar una petición sin token devuelve 401 (WEB-101)", async ({ request }) => {
  const respuesta = await request.post(`${API}/requests/process`, { data: PETICION });

  expect(respuesta.status()).toBe(401);
});

test("una variable no soportada se rechaza con 400 antes de llegar al CDS (WEB-221)", async ({ request }) => {
  const respuesta = await request.post(`${API}/requests/process`, {
    data: { ...PETICION, variableName: "humidity" },
    headers: autorizacion(),
  });

  expect(respuesta.status()).toBe(400);
});

test("con token se consultan las solicitudes propias", async ({ request }) => {
  const respuesta = await request.get(`${API}/requests/my-requests`, { headers: autorizacion() });

  expect(respuesta.status()).toBe(200);
  expect(Array.isArray(await respuesta.json())).toBe(true);
});
