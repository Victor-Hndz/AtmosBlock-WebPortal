import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { ANONIMO, API, SESION, USUARIO, estadoNavegador, nuevoEmail } from "./soporte";

// Un único registro por ejecución: la API limita auth a 5 peticiones por minuto.
setup("usuario de prueba y estados del navegador", async ({ request }) => {
  const credenciales = { name: "Usuario E2E", email: nuevoEmail(), password: `E2e-${Date.now()}-Clave!` };

  const respuesta = await request.post(`${API}/auth/register`, { data: credenciales });
  expect(respuesta.status(), await respuesta.text()).toBe(201);
  const { accessToken, user } = await respuesta.json();

  mkdirSync(path.dirname(USUARIO), { recursive: true });
  writeFileSync(USUARIO, JSON.stringify({ ...credenciales, token: accessToken }));
  writeFileSync(ANONIMO, JSON.stringify(estadoNavegador({ i18nextLng: "es" })));
  writeFileSync(
    SESION,
    JSON.stringify(
      estadoNavegador({ i18nextLng: "es", token: accessToken, auth: JSON.stringify({ user, isAuthenticated: true }) })
    )
  );
});
