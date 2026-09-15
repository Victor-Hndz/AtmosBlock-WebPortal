import { defineConfig, devices } from "@playwright/test";
import { FRONT } from "./tests/soporte";

const CI = !!process.env.CI;

/**
 * Pruebas de extremo a extremo contra la pila de docker compose (API en :3000) y el frontend (:5173).
 *
 * - `sesion`: registra un usuario de prueba por API y guarda los estados del navegador (con y sin sesión).
 * - `portal`: navegador y API sin el CDS. Es el check del CI.
 * - `pipeline`: una petición real de principio a fin con el caso de ejemplo copiado al volumen del
 *   configurador (sin el CDS). Tarda minutos: se lanza a propósito con `npm run test:pipeline`.
 */
export default defineConfig({
  testDir: "./tests",
  // Una sola API con base de datos compartida y límite de 5 peticiones/min en auth: en serie.
  workers: 1,
  forbidOnly: CI,
  retries: 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: FRONT,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "sesion", testMatch: /sesion\.setup\.ts/ },
    {
      name: "portal",
      testIgnore: /pipeline\.spec\.ts/,
      dependencies: ["sesion"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "pipeline",
      testMatch: /pipeline\.spec\.ts/,
      dependencies: ["sesion"],
      use: { ...devices["Desktop Chrome"] },
      timeout: 20 * 60_000,
    },
  ],
  webServer: {
    // En el CI, el build de producción; en local se reutiliza el servidor de desarrollo si ya está levantado.
    command: CI
      ? "npm --prefix ../frontend run build && npm --prefix ../frontend run preview -- --port 5173 --strictPort"
      : "npm --prefix ../frontend run dev -- --port 5173 --strictPort",
    url: FRONT,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
