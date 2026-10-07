// PRD-508: lógica pura del visor público de la previsión de bloqueos (la usa visor.js; tests en test_logica.mjs).

/** Diferencia (en tanto por uno) a partir de la cual se dice "más/menos de lo habitual". Orientativa, solo para
 *  mostrar: no es una definición del preregistro ni se verifica. */
export const MARGEN_HABITUAL = 0.1;

/** Compara la probabilidad prevista con la normal para la época (climatología ERA5 1991–2020). */
export function comparar(prevista, normal) {
  if (normal === null || normal === undefined) return { clave: "sin_referencia", diferencia: null };
  const diferencia = prevista - normal;
  const clave = diferencia > MARGEN_HABITUAL ? "mas" : diferencia < -MARGEN_HABITUAL ? "menos" : "habitual";
  return { clave, diferencia };
}

/** Fecha (AAAA-MM-DD) que corresponde al día de plazo `dia` de la pasada `fecha` (AAAAMMDD). */
export function fechaValida(fecha, dia) {
  const t = Date.UTC(+fecha.slice(0, 4), +fecha.slice(4, 6) - 1, +fecha.slice(6, 8) + dia);
  return new Date(t).toISOString().slice(0, 10);
}

/** Celdas del mapa con probabilidad > 0 el día `dia`, con su caja [oeste, sur, este, norte] en grados. */
export function celdas(mapa, dia) {
  if (!mapa) return [];
  const dlat = mapa.lat.length > 1 ? mapa.lat[1] - mapa.lat[0] : mapa.dlon;
  const salida = [];
  mapa.prob[dia].forEach((fila, i) =>
    fila.forEach((v, j) => {
      if (v <= 0) return;
      const lat = mapa.lat[i];
      const lon = mapa.lon0 + j * mapa.dlon;
      salida.push({ lat, lon, p: v / 100, caja: [lon - mapa.dlon / 2, lat - dlat / 2, lon + mapa.dlon / 2, lat + dlat / 2] });
    })
  );
  return salida;
}

/** Lectura sencilla de una fila del resumen de verificación (preregistro: habilidad solo si el IC90 excluye 0). */
export function nivelBss(fila) {
  if (fila.bss === null || fila.bss === undefined) return "sin_datos";
  if (fila.habilidad) return "mejor";
  return fila.bss < 0 ? "peor" : "dudoso";
}

/** Probabilidad de que empiece un bloqueo en los días 1–5 y 6–10 (variante V2 del preregistro), solo si la región
 *  está en calma-V2: sin bloqueos grandes en los 5 días previos. null si no se evalúa. */
export function posibleInicio(sector) {
  if (!sector?.calma_v2 || !sector.prob_inicio_v2) return null;
  const avisos = sector.aviso_inicio_v2 ?? [];
  return Object.entries(sector.prob_inicio_v2).map(([ventana, p]) => ({ ventana, p, aviso: avisos.includes(ventana) }));
}
