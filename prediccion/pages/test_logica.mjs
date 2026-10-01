// PRD-508: lógica pura del visor público (sin navegador). Uso: node --test prediccion/pages/test_logica.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { comparar, fechaValida, celdas, nivelBss, MARGEN_HABITUAL } from "./logica.js";

test("compara lo previsto con lo habitual para la época, con un margen de 10 puntos", () => {
  assert.equal(MARGEN_HABITUAL, 0.1);
  assert.equal(comparar(0.74, 0.6).clave, "mas");
  assert.equal(comparar(0.3, 0.6).clave, "menos");
  assert.equal(comparar(0.65, 0.6).clave, "habitual");
  assert.equal(comparar(0.7, 0.6).clave, "habitual"); // justo en el margen: no se exagera
  assert.equal(comparar(0.5, null).clave, "sin_referencia");
});

test("fecha de validez de un día de plazo", () => {
  assert.equal(fechaValida("20260930", 0), "2026-09-30");
  assert.equal(fechaValida("20260930", 3), "2026-10-03");
  assert.equal(fechaValida("20261229", 5), "2027-01-03");
});

test("celdas del mapa con probabilidad, con su caja en latitud y longitud", () => {
  const mapa = { lat: [30, 32.5], lon0: -180, dlon: 2.5, prob: [[[0, 40, 0], [0, 0, 100]]] };
  assert.deepEqual(celdas(mapa, 0), [
    { lat: 30, lon: -177.5, p: 0.4, caja: [-178.75, 28.75, -176.25, 31.25] },
    { lat: 32.5, lon: -175, p: 1, caja: [-176.25, 31.25, -173.75, 33.75] },
  ]);
  assert.deepEqual(celdas(undefined, 0), []);
});

test("lectura sencilla del BSS", () => {
  assert.equal(nivelBss({ bss: 0.4, habilidad: true }), "mejor");
  assert.equal(nivelBss({ bss: 0.1, habilidad: false }), "dudoso");
  assert.equal(nivelBss({ bss: -0.2, habilidad: false }), "peor");
  assert.equal(nivelBss({ bss: null, habilidad: false }), "sin_datos");
});
