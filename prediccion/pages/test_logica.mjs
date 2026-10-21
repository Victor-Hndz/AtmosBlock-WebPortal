// PRD-508: lógica pura del visor público (sin navegador). Uso: node --test prediccion/pages/test_logica.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comparar,
  fechaValida,
  celdas,
  nivelBss,
  posibleInicio,
  MARGEN_HABITUAL,
  cajaRegion,
  isolineas,
  leerHash,
  escribirHash,
  enDam,
  origenSenal,
  varianteV1,
} from "./logica.js";

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

test("posible inicio solo con la región en calma (variante V2) y con el aviso de p ≥ 0,5", () => {
  const enCalma = {
    calma_v2: true,
    prob_inicio_v2: { dias_1_5: 0.62, dias_6_10: 0.2 },
    aviso_inicio_v2: ["dias_1_5"],
  };
  assert.deepEqual(posibleInicio(enCalma), [
    { ventana: "dias_1_5", p: 0.62, aviso: true },
    { ventana: "dias_6_10", p: 0.2, aviso: false },
  ]);
  assert.equal(posibleInicio({ ...enCalma, calma_v2: false }), null);
  assert.equal(posibleInicio({ probabilidad: [] }), null); // JSON anterior a la variante V2
});

test("caja del zoom de una región, con margen, el norte hasta 90 y el Pacífico a través de ±180", () => {
  assert.deepEqual(cajaRegion({ lat: [40, 75], lon: [-26.25, 41.25] }, 10), [-36.25, 30, 51.25, 85]);
  assert.deepEqual(cajaRegion({ lat: [40, 75], lon: [120, -140] }, 10), [110, 30, 230, 85]);
  assert.deepEqual(cajaRegion({ lat: [40, 85], lon: [0, 10] }, 10), [-10, 30, 20, 90]);
});

/** Rejilla como la de los _z500.json (20–90°N, 144 longitudes desde −180) con z(lat, lon). */
function rejilla(f) {
  const lat = Array.from({ length: 29 }, (_, i) => 20 + 2.5 * i);
  return { lat, lon0: -180, dlon: 2.5, z: lat.map(la => Array.from({ length: 144 }, (_, j) => f(la, -180 + 2.5 * j))) };
}

test("isolíneas cada 6 dam (60 m) con la etiqueta en dam: anillos alrededor del polo, enteros a través de ±180", () => {
  const iso = isolineas(rejilla(la => 587 - 1.2 * (la - 20))); // 587 dam en 20°N, 503 en 90°N
  assert.deepEqual(
    iso.map(l => l.valor),
    Array.from({ length: 14 }, (_, k) => 504 + 6 * k)
  );
  assert.deepEqual(iso.map(l => l.etiqueta).slice(0, 3), ["504", "510", "516"]);
  assert.equal(iso.find(l => l.valor === 552).etiqueta, "552");
  for (const l of iso) {
    assert.equal(l.type, "MultiLineString");
    assert.equal(l.coordinates.length, 1, `${l.valor}: una sola línea, sin cortes`);
    const linea = l.coordinates[0];
    assert.deepEqual(linea[0], linea.at(-1), `${l.valor}: cerrada`);
    const lats = linea.map(p => p[1]);
    const esperada = 20 + (587 - l.valor) / 1.2;
    assert.ok(lats.every(x => Math.abs(x - esperada) < 1e-9), `${l.valor}: en ${esperada}°N`);
    assert.ok(linea.length >= 144);
  }
});

test("una isolínea alrededor de una dorsal en 180° no se corta en el cambio de fecha", () => {
  const alta = (la, lo) => {
    const d = Math.min(Math.abs(lo - 180), Math.abs(lo + 180));
    return 550 + 19 * Math.exp(-(((la - 55) / 8) ** 2) - (d / 15) ** 2);
  };
  const iso = isolineas(rejilla(alta));
  assert.deepEqual(iso.map(l => l.valor), [552, 558, 564]);
  for (const l of iso) {
    assert.equal(l.coordinates.length, 1, `${l.valor}: una sola línea`);
    const linea = l.coordinates[0];
    assert.deepEqual(linea[0], linea.at(-1), `${l.valor}: cerrada`);
    assert.ok(linea.some(p => p[0] > 170) && linea.some(p => p[0] < -170), `${l.valor}: a los dos lados de ±180°`);
    assert.ok(linea.every(p => Math.abs(p[0]) >= 120), `${l.valor}: sin saltos por el resto del globo`);
  }
});

test("el Z500 medio se usa en dam; un _z500.json en metros (primer formato) se pasa a dam", () => {
  const dam = { unidades: "dam", lat: [20], lon0: -180, dlon: 2.5, z: [[[552, 558]]] };
  assert.equal(enDam(dam), dam);
  assert.deepEqual(enDam({ ...dam, unidades: "m", z: [[[5520, 5583]]] }), { ...dam, z: [[[552, 558.3]]] });
  assert.equal(enDam(null), null);
  const campo = rejilla(la => 5870 - 12 * (la - 20)); // en m
  const m = enDam({ ...campo, unidades: "m", z: [campo.z] });
  assert.deepEqual(
    isolineas({ ...m, z: m.z[0] }).map(l => l.valor),
    Array.from({ length: 14 }, (_, k) => 504 + 6 * k)
  );
});

test("el hash del zoom: #region=EA&dia=3, con región y día validados", () => {
  assert.deepEqual(leerHash("#region=EA&dia=3"), { region: "EA", dia: 3 });
  assert.deepEqual(leerHash("#region=PA"), { region: "PA", dia: null });
  assert.deepEqual(leerHash("#region=LLB-Atl&dia=3"), { region: null, dia: 3 }); // baja latitud: sin zoom
  assert.deepEqual(leerHash("#region=EA&dia=16"), { region: "EA", dia: null });
  assert.deepEqual(leerHash("#region=EA&dia=2.5"), { region: "EA", dia: null });
  assert.deepEqual(leerHash("#region=EA&dia="), { region: "EA", dia: null });
  assert.deepEqual(leerHash(""), { region: null, dia: null });
  assert.equal(escribirHash({ region: "EA", dia: 3 }), "#region=EA&dia=3");
  assert.equal(escribirHash({ region: null, dia: 3 }), "");
  assert.deepEqual(leerHash(escribirHash({ region: "NAM", dia: 0 })), { region: "NAM", dia: 0 });
});

/** Mapa como el del JSON (30–75°N, 144 longitudes desde −180) del día 0, con prob(lat, lon) en %. */
function mapaCon(prob) {
  const lat = Array.from({ length: 19 }, (_, i) => 30 + 2.5 * i);
  return { lat, lon0: -180, dlon: 2.5, prob: [lat.map(la => Array.from({ length: 144 }, (_, j) => prob(la, -180 + 2.5 * j)))] };
}
const GRL = { lat: [40, 75], lon: [-90, -26.25] };
const PA = { lat: [40, 75], lon: [120, -140] };

test("de dónde viene la señal: solo del borde sur (40–42,5°N) de la región", () => {
  const mapa = mapaCon((la, lo) => {
    if (lo === -50 && (la === 40 || la === 42.5)) return 80;
    if (lo === -50 && la === 60) return 30; // menos de la mitad del máximo de la región
    if (la === 37.5 || lo === 0) return 100; // fuera de las filas o de las columnas de la región
    return 0;
  });
  assert.deepEqual(origenSenal(mapa, 0, GRL), { banda: [40, 42.5], bordeSur: true });
});

test("de dónde viene la señal: en 55–65°N, también en una región que cruza ±180", () => {
  const mapa = mapaCon((la, lo) => (la >= 55 && la <= 65 && (lo === 177.5 || lo === -177.5) ? (la === 60 ? 90 : 50) : 0));
  assert.deepEqual(origenSenal(mapa, 0, PA), { banda: [55, 65], bordeSur: false });
  assert.equal(origenSenal(mapa, 0, GRL), null); // en GRL no hay nada
});

test("de dónde viene la señal: sin señal o sin mapa, null", () => {
  assert.equal(origenSenal(mapaCon(() => 0), 0, GRL), null);
  assert.equal(origenSenal(undefined, 0, GRL), null);
});

test("variante V1 junto al primario: solo si el producto la trae", () => {
  const s = { probabilidad: [0.9, 0.88], probabilidad_v1: [0, 0.02], normal_v1: [0.3, 0.31] };
  assert.deepEqual(varianteV1(s, 1), { p: 0.02, normal: 0.31 });
  assert.deepEqual(varianteV1({ ...s, normal_v1: null }, 0), { p: 0, normal: null });
  assert.equal(varianteV1({ probabilidad: [0.9] }, 0), null); // producto anterior al despliegue
  assert.equal(varianteV1(undefined, 0), null);
});
