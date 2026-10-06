// Textos del visor público en español e inglés. Uso: node --test prediccion/pages/test_textos.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXTOS, elegirIdioma } from "./textos.js";

const claves = o =>
  Object.entries(o)
    .flatMap(([k, v]) => (typeof v === "object" && v !== null ? claves(v).map(c => `${k}.${c}`) : [k]))
    .sort();

test("español e inglés tienen las mismas claves y ninguna vacía", () => {
  assert.deepEqual(claves(TEXTOS.en), claves(TEXTOS.es));
  for (const idioma of ["es", "en"]) {
    for (const c of claves(TEXTOS[idioma])) {
      const v = c.split(".").reduce((o, k) => o[k], TEXTOS[idioma]);
      assert.ok(typeof v === "function" || String(v).trim(), `${idioma}.${c} vacío`);
    }
  }
});

test("el idioma: el parámetro manda; si no, el del navegador; por defecto, español", () => {
  assert.equal(elegirIdioma("en", "es-ES"), "en");
  assert.equal(elegirIdioma("es", "en-US"), "es");
  assert.equal(elegirIdioma(null, "en-GB"), "en");
  assert.equal(elegirIdioma(null, "fr-FR"), "es");
  assert.equal(elegirIdioma("de", undefined), "es");
});
