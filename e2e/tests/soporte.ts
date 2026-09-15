import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:3000/api";
export const FRONT = process.env.E2E_FRONT_URL ?? "http://localhost:5173";

// Los textos salen de las traducciones del propio frontend: cambiar un literal no rompe las pruebas.
const traducciones = (idioma: string) =>
  JSON.parse(readFileSync(path.join(__dirname, "../../frontend/public/locales", idioma, "common.json"), "utf-8"));
export const es = traducciones("es");
export const en = traducciones("en");

const AUTH = path.join(__dirname, "../.auth");
/** Credenciales y token del usuario de prueba creado en sesion.setup.ts. */
export const USUARIO = path.join(AUTH, "usuario.json");
/** Estado del navegador sin sesión, en español. */
export const ANONIMO = path.join(AUTH, "anonimo.json");
/** Estado del navegador con la sesión del usuario de prueba, en español. */
export const SESION = path.join(AUTH, "sesion.json");

export interface Usuario {
  name: string;
  email: string;
  password: string;
  token: string;
}

export const usuario = (): Usuario => JSON.parse(readFileSync(USUARIO, "utf-8"));

export const nuevoEmail = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;

/** storageState con valores de localStorage para el origen del frontend. */
export const estadoNavegador = (valores: Record<string, string>) => ({
  cookies: [],
  origins: [{ origin: FRONT, localStorage: Object.entries(valores).map(([name, value]) => ({ name, value })) }],
});

/** Petición mínima del formulario: geopotencial a 500 hPa. */
export const PETICION = {
  variableName: "geopotential",
  pressureLevels: ["500"],
  years: ["2022"],
  months: ["03"],
  days: ["14"],
  hours: ["12"],
  areaCovered: ["90", "-180", "-90", "180"],
  mapTypes: ["comb"],
  fileFormat: "png",
};

// La cabecera repite algunos controles en su versión móvil (oculta en escritorio): solo el visible.
export const botonIdioma = (page: Page, textos = es) =>
  page.getByRole("button", { name: textos.language.switchLanguage }).filter({ visible: true }).first();

export const menuUsuario = (page: Page) =>
  page.getByRole("button", { name: es.profile.userMenu }).filter({ visible: true }).first();
