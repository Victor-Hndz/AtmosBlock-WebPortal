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

/** Regiones con zoom (las cinco del mapa; las de baja latitud, no) y días de plazo del producto. */
export const REGIONES_ZOOM = ["GRL", "EA", "URA", "PA", "NAM"];
export const ULTIMO_DIA = 15;

/** Caja [oeste, sur, este, norte] del zoom de una región de sectores_geo, con `margen` grados a cada lado, el norte
 *  hasta 90 y el este continuo a través de ±180 (si este < oeste, +360: el Pacífico va de 110 a 230). */
export function cajaRegion({ lat: [s, n], lon: [o, e] }, margen = 10) {
  const este = e < o ? e + 360 : e;
  return [o - margen, s - margen, este + margen, Math.min(90, n + margen)];
}

/** Z500 medio de un _z500.json en dam; los del primer formato venían en m. null si no hay. */
export function enDam(z500) {
  if (!z500 || z500.unidades !== "m") return z500;
  return { ...z500, unidades: "dam", z: z500.z.map(dia => dia.map(fila => fila.map(v => v / 10))) };
}

/** Isolíneas de un campo {lat, lon0, dlon, z[lat][lon]} (Z500 medio en dam, longitudes de toda la vuelta) cada
 *  `intervalo` dam (6 = 60 m): un MultiLineString por nivel con {valor y etiqueta en dam}. Marching squares con la
 *  longitud periódica (la columna de cierre en ±180 es la primera), así que las líneas siguen enteras a través de ±180. */
export function isolineas({ lat, lon0, dlon, z }, intervalo = 6) {
  const nl = z[0].length;
  const valores = z.flat();
  const niveles = [];
  for (let v = Math.ceil(Math.min(...valores) / intervalo) * intervalo; v <= Math.max(...valores); v += intervalo) {
    niveles.push(v);
  }
  return niveles
    .map(valor => ({ type: "MultiLineString", coordinates: lineas(lat, lon0, dlon, z, nl, valor), valor, etiqueta: String(valor) }))
    .filter(l => l.coordinates.length);
}

function lineas(lat, lon0, dlon, z, nl, v) {
  const segmentos = [];
  for (let i = 0; i + 1 < lat.length; i++) {
    for (let j = 0; j < nl; j++) {
      const j1 = (j + 1) % nl;
      const [a, b, c, d] = [z[i][j], z[i][j1], z[i + 1][j1], z[i + 1][j]]; // esquinas SO, SE, NE, NO
      const t = (p, q) => (v - p) / (q - p);
      // aristas S, E, N y O con su clave (compartida con la celda vecina) y el punto donde las corta el nivel
      const aristas = [
        [a, b, `h${i},${j}`, () => [lon0 + (j + t(a, b)) * dlon, lat[i]]],
        [b, c, `v${i},${j1}`, () => [lon0 + (j + 1) * dlon, lat[i] + t(b, c) * (lat[i + 1] - lat[i])]],
        [d, c, `h${i + 1},${j}`, () => [lon0 + (j + t(d, c)) * dlon, lat[i + 1]]],
        [a, d, `v${i},${j}`, () => [lon0 + j * dlon, lat[i] + t(a, d) * (lat[i + 1] - lat[i])]],
      ]
        .map(([p, q, clave, punto], k) => (p >= v) !== (q >= v) && { k, clave, punto: punto() })
        .filter(Boolean);
      if (aristas.length === 2) segmentos.push(aristas);
      else if (aristas.length === 4) {
        // punto de silla: si el centro está del lado de la esquina SO, se aíslan las esquinas SE y NO
        const [s, e, n, o] = aristas;
        const conSO = (a + b + c + d) / 4 >= v === a >= v;
        segmentos.push(...(conSO ? [[s, e], [n, o]] : [[s, o], [e, n]]));
      }
    }
  }
  return unir(segmentos);
}

/** Une los segmentos que comparten arista en líneas; las cerradas repiten el primer punto al final. */
function unir(segmentos) {
  const porClave = new Map();
  segmentos.forEach((s, k) => s.forEach(({ clave }) => porClave.set(clave, [...(porClave.get(clave) ?? []), k])));
  const usado = new Uint8Array(segmentos.length);
  const salida = [];
  segmentos.forEach(([a, b], k0) => {
    if (usado[k0]) return;
    usado[k0] = 1;
    const linea = [a.punto, b.punto];
    for (const [extremo, alFinal] of [
      [b.clave, true],
      [a.clave, false],
    ]) {
      let clave = extremo;
      for (;;) {
        const k = porClave.get(clave).find(x => !usado[x]);
        if (k === undefined) break;
        usado[k] = 1;
        const siguiente = segmentos[k][0].clave === clave ? segmentos[k][1] : segmentos[k][0];
        if (alFinal) linea.push(siguiente.punto);
        else linea.unshift(siguiente.punto);
        clave = siguiente.clave;
      }
    }
    salida.push(linea);
  });
  return salida;
}

/** Lee #region=EA&dia=3; lo que no sea una región con zoom o un día entero de 0 a 15 queda en null. */
export function leerHash(hash) {
  const p = new URLSearchParams(String(hash ?? "").replace(/^#/, ""));
  const region = REGIONES_ZOOM.includes(p.get("region")) ? p.get("region") : null;
  const texto = p.get("dia") ?? "";
  const dia = /^\d{1,2}$/.test(texto) && +texto <= ULTIMO_DIA ? +texto : null;
  return { region, dia };
}

/** Hash del zoom; sin región, vacío (la vista del hemisferio). */
export function escribirHash({ region, dia }) {
  return region ? `#region=${region}&dia=${dia}` : "";
}
