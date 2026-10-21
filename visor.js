// PRD-508: visor público de la previsión de bloqueos (GitHub Pages). Lee prediccion/index.json, el JSON diario del
// producto y prediccion/verificacion.json. Con ?embed=1 solo muestra controles, mapa y tarjetas (para el portal).
// Pulsar una región abre su zoom (#region=EA&dia=3), con las isolíneas del Z500 medio (<fecha>_z500.json).
/* global d3, topojson */
import {
  comparar,
  fechaValida,
  celdas,
  nivelBss,
  posibleInicio,
  cajaRegion,
  isolineas,
  leerHash,
  escribirHash,
  enDam,
  origenSenal,
  varianteV1,
} from "./logica.js";
import { TEXTOS, elegirIdioma } from "./textos.js";

const BASE = "prediccion";
const LAT_REGIONES = 40; // por debajo, bloqueos de baja latitud: se dibujan atenuados
const TIERRA = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json";
const PAISES = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json"; // solo en el zoom
const GIRO = -10; // Europa abajo en el centro

const params = new URLSearchParams(location.search);
const embed = params.has("embed");
if (embed) document.body.classList.add("embed");

// ---------- idioma ----------
const idioma = elegirIdioma(params.get("lang"), navigator.language);
const T = TEXTOS[idioma];
const NOMBRES = T.regiones;
const MODELOS = T.modelos;
const valor = clave => clave.split(".").reduce((o, k) => o?.[k], T);
document.documentElement.lang = idioma;
document.title = T.tituloPagina;
document.querySelectorAll("[data-t]").forEach(e => (e.textContent = valor(e.dataset.t)));
document.querySelectorAll("[data-t-html]").forEach(e => (e.innerHTML = valor(e.dataset.tHtml))); // textos propios
document.querySelectorAll("[data-t-aria]").forEach(e => e.setAttribute("aria-label", valor(e.dataset.tAria)));
document.querySelectorAll(".idiomas a").forEach(a => {
  const otros = new URLSearchParams(location.search);
  otros.set("lang", a.dataset.lang);
  a.href = `?${otros}`;
  if (a.dataset.lang === idioma) a.setAttribute("aria-current", "true");
});

const estado = {
  indice: null,
  modelo: params.get("modelo") === "aifs" ? "aifs" : "ifs",
  fecha: params.get("fecha"),
  dia: Math.min(15, Math.max(0, Number(params.get("dia") ?? 1) || 0)),
  producto: null,
  region: null, // con región, la vista de zoom
};
const hashInicial = leerHash(location.hash);
estado.region = hashInicial.region;
if (hashInicial.dia !== null) estado.dia = hashInicial.dia;

const $ = s => document.querySelector(s);
const pct = p => `${Math.round(p * 100)} %`;
const legible = (f, opciones = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(`${f.length === 8 ? `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}` : f}T00:00:00Z`).toLocaleDateString(
    T.locale,
    { timeZone: "UTC", ...opciones }
  );
const avisar = texto => ($("#estado").textContent = texto);

async function leer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const leidos = new Map();
/** Cada URL se pide una sola vez; si falla, null. */
function leerUnaVez(url) {
  if (!leidos.has(url)) leidos.set(url, leer(url).catch(() => null));
  return leidos.get(url);
}

function avisarAltura() {
  if (embed && window.parent !== window) {
    // la altura del contenido, no scrollHeight: dentro del iframe no baja de la que ya tiene (al salir del zoom)
    const altura = Math.ceil(document.documentElement.getBoundingClientRect().height);
    window.parent.postMessage({ tipo: "atmosblock-altura", altura }, "*");
  }
}

// ---------- mapa ----------
const proyeccion = d3
  .geoAzimuthalEqualArea()
  .rotate([GIRO, -90])
  .clipAngle(74)
  .fitExtent(
    [
      [12, 12],
      [588, 588],
    ],
    { type: "Sphere" }
  );
const ruta = d3.geoPath(proyeccion);
const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 1]);
const svg = d3.select("#mapa");

function caja([o, s, e, n]) {
  return { type: "Polygon", coordinates: [[[o, s], [o, n], [e, n], [e, s], [o, s]]] };
}

function contornoSector({ lat: [s, n], lon: [o, e] }) {
  const este = e < o ? e + 360 : e;
  const lons = d3.range(o, este + 0.01, 2.5);
  const anillo = [[o, s], ...lons.map(l => [l, n]), ...lons.reverse().map(l => [l, s])];
  return { type: "Polygon", coordinates: [anillo] };
}

async function dibujarBase() {
  svg.append("path").attr("class", "esfera").attr("d", ruta({ type: "Sphere" }));
  svg.append("path").attr("class", "reticula").attr("d", ruta(d3.geoGraticule10()));
  const capaTierra = svg.append("g");
  svg.append("g").attr("id", "celdas");
  svg.append("g").attr("id", "costas");
  svg.append("g").attr("id", "sectores");
  try {
    const t = await leer(TIERRA);
    capaTierra.append("path").attr("class", "tierra").attr("d", ruta(topojson.feature(t, t.objects.land)));
    svg
      .select("#costas")
      .append("path")
      .attr("d", ruta(topojson.mesh(t, t.objects.land)))
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.45);
  } catch {
    /* sin costas el mapa sigue siendo legible */
  }
}

function dibujarMapa() {
  const p = estado.producto;
  const datos = p?.mapa ? celdas(p.mapa, estado.dia).filter(c => c.p >= 0.05) : [];
  svg
    .select("#celdas")
    .selectAll("path")
    .data(datos)
    .join("path")
    .attr("d", c => ruta(caja(c.caja)))
    .attr("fill", c => color(c.p))
    .attr("fill-opacity", c => (c.lat < LAT_REGIONES ? 0.3 : 0.85))
    .attr("stroke", "none");
  const geo = p?.sectores_geo ?? {};
  const sect = Object.keys(NOMBRES).filter(s => geo[s]);
  svg
    .select("#sectores")
    .selectAll("g")
    .data(sect, s => s)
    .join(entra => {
      const g = entra
        .append("g")
        .attr("class", "sector-g")
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("data-region", s => s)
        .on("click", (_, s) => entrar(s))
        .on("keydown", (e, s) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            entrar(s);
          }
        });
      g.append("path").attr("class", "sector");
      g.append("text").attr("class", "sector-nombre").attr("text-anchor", "middle");
      return g;
    })
    .each(function (s) {
      const g = d3.select(this).attr("aria-label", T.verRegion(NOMBRES[s]));
      const forma = contornoSector(geo[s]);
      g.select("path").attr("d", ruta(forma));
      const { lat, lon } = geo[s];
      const este = lon[1] < lon[0] ? lon[1] + 360 : lon[1];
      const [x, y] = proyeccion([(lon[0] + este) / 2, lat[0] + 6]);
      g.select("text").attr("x", x).attr("y", y).text(T.cortos[s]);
    });
  const aviso = svg.select("#sin-mapa");
  if (p && !p.mapa) {
    if (aviso.empty()) {
      svg
        .append("text")
        .attr("id", "sin-mapa")
        .attr("x", 300)
        .attr("y", 300)
        .attr("text-anchor", "middle")
        .attr("class", "sector-nombre")
        .text(T.sinMapa);
    }
  } else aviso.remove();
}

// ---------- tarjetas ----------
function miniGrafica(prevista, normal, dia) {
  const ancho = 300;
  const alto = 56;
  const x = d3.scaleLinear([0, 15], [4, ancho - 4]);
  const y = d3.scaleLinear([0, 1], [alto - 4, 4]);
  const linea = d3.line((_, i) => x(i), v => y(v));
  const area = d3.area((_, i) => x(i), y(0), v => y(v));
  return `<svg class="mini" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true">
    <path class="area" d="${area(prevista)}"></path>
    ${normal ? `<path class="normal" d="${linea(normal)}"></path>` : ""}
    <path class="linea" d="${linea(prevista)}"></path>
    <line class="marca-dia" x1="${x(dia)}" x2="${x(dia)}" y1="0" y2="${alto}"></line>
  </svg>`;
}

function dibujarTarjetas() {
  const p = estado.producto;
  const caja = $("#tarjetas");
  if (!p) return (caja.innerHTML = "");
  caja.innerHTML = Object.entries(NOMBRES)
    .map(([s, nombre]) => {
      const d = p.sectores[s];
      if (!d) return "";
      const prevista = d.probabilidad[estado.dia];
      const normal = d.normal ? d.normal[estado.dia] : null;
      const c = comparar(prevista, normal);
      const inicio = (posibleInicio(d) ?? []).filter(x => x.ventana in T.ventanas);
      const v1 = varianteV1(d, estado.dia);
      return `<article class="tarjeta" data-region="${s}">
        <h3><button type="button" class="ver-region" aria-label="${T.verRegion(nombre)}">${nombre}</button></h3>
        <div class="cifras">
          <span class="prevista">${pct(prevista)}</span>
          ${normal === null ? "" : `<span class="tenue">${T.habitual}: ${pct(normal)}</span>`}
          ${c.clave in T.compara ? `<span class="chip ${c.clave}">${T.compara[c.clave]}</span>` : ""}
        </div>
        ${v1 ? `<p class="v1 tenue">${T.lineaV1(pct(v1.p), v1.normal === null ? null : pct(v1.normal))}</p>` : ""}
        ${miniGrafica(d.probabilidad, d.normal, estado.dia)}
        <span class="tenue" style="font-size:12px">${T.notaTarjeta}</span>
        ${
          inicio.length
            ? `<p class="inicio">${T.inicio}: ${inicio
                .map(x => `<span class="${x.aviso ? "aviso-inicio" : ""}">${T.ventanas[x.ventana]} ${pct(x.p)}</span>`)
                .join(" · ")}<br><span class="tenue" style="font-size:12px">${T.notaInicio}</span></p>`
            : ""
        }
      </article>`;
    })
    .join("");
}

// ---------- zoom por región ----------
const ANCHO_ZOOM = 600;
const ALTO_ZOOM = 460;
const svgZoom = d3.select("#mapa-zoom");
const capas = Object.fromEntries(
  ["fondo", "tierra", "celdas", "bordes", "isolineas", "etiquetas", "recuadro"].map(c => [c, svgZoom.append("g")])
);
const zoom = { base: null, proyeccion: null, ruta: null, z500: null };

function entrar(region) {
  history.pushState(null, "", `${location.pathname}${location.search}${escribirHash({ region, dia: estado.dia })}`);
  estado.region = region;
  dibujar();
  $("#volver").focus();
}

function salir() {
  const region = estado.region;
  history.pushState(null, "", `${location.pathname}${location.search}`);
  estado.region = null;
  dibujar();
  svg.select(`.sector-g[data-region="${region}"]`).node()?.focus();
}

/** Proyección, tierra, fronteras y recuadro: solo cambian con la región. */
function dibujarBaseZoom(region, geo, paises) {
  const [o, s, e, n] = cajaRegion(geo);
  zoom.proyeccion = d3
    .geoAzimuthalEqualArea()
    .rotate([-(o + e) / 2, -(s + n) / 2])
    .clipAngle(90)
    .fitExtent(
      [
        [8, 8],
        [ANCHO_ZOOM - 8, ALTO_ZOOM - 8],
      ],
      contornoSector({ lat: [s, n], lon: [o, e] })
    )
    .clipExtent([
      [0, 0],
      [ANCHO_ZOOM, ALTO_ZOOM],
    ]);
  zoom.ruta = d3.geoPath(zoom.proyeccion);
  Object.values(capas).forEach(c => c.selectAll("*").remove());
  capas.fondo.append("path").attr("class", "esfera").attr("d", zoom.ruta({ type: "Sphere" }));
  capas.fondo.append("path").attr("class", "reticula").attr("d", zoom.ruta(d3.geoGraticule10()));
  if (paises) {
    capas.tierra.append("path").attr("class", "tierra").attr("d", zoom.ruta(topojson.feature(paises, paises.objects.land)));
    capas.bordes
      .append("path")
      .attr("class", "fronteras")
      .attr("d", zoom.ruta(topojson.mesh(paises, paises.objects.countries, (a, b) => a !== b)));
    capas.bordes.append("path").attr("class", "costas").attr("d", zoom.ruta(topojson.mesh(paises, paises.objects.land)));
  }
  capas.recuadro.append("path").attr("class", "recuadro").attr("d", zoom.ruta(contornoSector(geo)));
  zoom.base = region;
}

/** Etiqueta (en dam) en el punto central de cada tramo visible de cada isolínea. */
function etiquetasIsolineas(niveles) {
  const dentro = ([x, y]) => x > 16 && x < ANCHO_ZOOM - 16 && y > 12 && y < ALTO_ZOOM - 12;
  const salida = [];
  for (const nivel of niveles) {
    for (const linea of nivel.coordinates) {
      let tramo = [];
      for (const punto of [...linea, null]) {
        const xy = punto && zoom.proyeccion(punto);
        if (xy && dentro(xy)) tramo.push(xy);
        else {
          if (tramo.length >= 8) salida.push({ xy: tramo[tramo.length >> 1], texto: nivel.etiqueta });
          tramo = [];
        }
      }
    }
  }
  return salida;
}

function graficaZoom(series, normal, v1) {
  const ancho = 560;
  const alto = 220;
  const [izq, der, arriba, abajo] = [44, 12, 10, 26];
  const x = d3.scaleLinear([0, 15], [izq, ancho - der]);
  const y = d3.scaleLinear([0, 1], [alto - abajo, arriba]);
  const linea = d3.line((_, i) => x(i), v => y(v));
  const ejeY = [0, 0.25, 0.5, 0.75, 1]
    .map(
      v => `<line class="rejilla" x1="${izq}" x2="${ancho - der}" y1="${y(v)}" y2="${y(v)}"></line>
        <text class="eje" x="${izq - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="central">${pct(v)}</text>`
    )
    .join("");
  const ejeX = d3
    .range(16)
    .map(d => `<text class="eje" x="${x(d)}" y="${alto - 8}" text-anchor="middle">${d}</text>`)
    .join("");
  const lineas = series
    .map(([m, d]) => `<path class="serie serie-${m}${m === estado.modelo ? " activa" : ""}" d="${linea(d.probabilidad)}"></path>`)
    .join("");
  return `<svg class="grafica" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${T.graficaZoom}">
    ${ejeY}${ejeX}
    ${normal ? `<path class="normal" d="${linea(normal)}"></path>` : ""}
    ${lineas}
    ${v1 ? `<path class="serie-v1 serie-${estado.modelo}" d="${linea(v1)}"></path>` : ""}
    <line class="marca-dia" x1="${x(estado.dia)}" x2="${x(estado.dia)}" y1="${arriba}" y2="${alto - abajo}"></line>
  </svg>`;
}

const bandaTexto = ([sur, norte]) => {
  const num = v => v.toLocaleString(T.locale);
  return sur === norte ? `${num(sur)}°N` : `${num(sur)}–${num(norte)}°N`;
};

/** Gráfica de los 15 días con IFS y AIFS (el que haya), V1 del modelo activo y lo habitual; tabla del día con V1,
 *  área e inicio; y, si la probabilidad del día sale del borde sur de la región, una frase con V1. */
function dibujarPanelZoom(region, otro, delOtro) {
  const series = Object.keys(MODELOS)
    .map(m => [m, (m === estado.modelo ? estado.producto : delOtro)?.sectores?.[region]])
    .filter(([, d]) => d);
  const normal = series.map(([, d]) => d.normal).find(Boolean);
  const activo = estado.producto.sectores[region];
  const v1 = varianteV1(activo, estado.dia);
  const origen = origenSenal(estado.producto.mapa, estado.dia, estado.producto.sectores_geo[region]);
  const frase =
    origen?.bordeSur && activo.probabilidad[estado.dia] > 0
      ? `<p class="origen">${T.origenBordeSur(bandaTexto(origen.banda), v1 ? pct(v1.p) : null)}</p>`
      : "";
  const filas = series
    .map(([m, d]) => {
      const inicio = Object.fromEntries((posibleInicio(d) ?? []).map(x => [x.ventana, x]));
      const v1d = varianteV1(d, estado.dia);
      const ventanas = Object.keys(T.ventanas)
        .map(v => `<td class="${inicio[v]?.aviso ? "aviso-inicio" : ""}">${inicio[v] ? pct(inicio[v].p) : "—"}</td>`)
        .join("");
      return `<tr><th scope="row"><span class="muestra serie-${m}"></span>${MODELOS[m]}</th>
        <td>${pct(d.probabilidad[estado.dia])}</td><td class="tenue">${v1d ? pct(v1d.p) : "—"}</td>
        <td>${pct(d.fraccion_area[estado.dia])}</td>${ventanas}</tr>`;
    })
    .join("");
  const muestras = series.map(([m]) => `<span><span class="muestra serie-${m}"></span>${MODELOS[m]}</span>`).join("");
  const muestraV1 = `<span><span class="muestra v1 serie-${estado.modelo}"></span>${T.leyendaV1(MODELOS[estado.modelo])}</span>`;
  $("#zoom-panel").innerHTML = `<h3>${T.graficaZoom}</h3>
    ${frase}
    ${graficaZoom(series, normal, activo.probabilidad_v1)}
    <p class="tenue series">${muestras}
      ${v1 ? muestraV1 : ""}
      ${normal ? `<span><span class="muestra normal"></span>${T.habitualEpoca}</span>` : ""}</p>
    <table class="tabla-zoom">
      <thead><tr><th>${T.colModelo}</th><th>${T.colProbabilidad(estado.dia)}</th><th>${T.colV1}</th>
        <th>${T.colArea}</th>
        ${Object.values(T.ventanas)
          .map(v => `<th>${T.colInicio(v)}</th>`)
          .join("")}</tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="tenue nota">${T.notaZoom}</p>
    ${delOtro ? "" : `<p class="tenue nota">${T.sinOtroModelo(MODELOS[otro])}</p>`}`;
}

async function dibujarZoom() {
  const { region, producto: p } = estado;
  $("#zoom-titulo").textContent = NOMBRES[region];
  svgZoom.attr("aria-label", T.zoomAria(NOMBRES[region]));
  const geo = p?.sectores_geo?.[region];
  if (!geo) {
    Object.values(capas).forEach(c => c.selectAll("*").remove());
    zoom.base = null;
    $("#zoom-panel").innerHTML = "";
    $("#zoom-leyenda").innerHTML = "";
    return;
  }
  const otro = estado.modelo === "ifs" ? "aifs" : "ifs";
  const [paises, z500m, delOtro] = await Promise.all([
    leerUnaVez(PAISES),
    leerUnaVez(`${BASE}/${estado.modelo}/${estado.fecha}_z500.json`),
    leerUnaVez(`${BASE}/${otro}/${estado.fecha}.json`),
  ]);
  if (estado.region !== region || estado.producto !== p) return; // mientras tanto se pidió otra cosa
  const z500 = enDam(z500m);
  if (zoom.base !== region) dibujarBaseZoom(region, geo, paises);
  zoom.z500 = z500;

  const datos = p.mapa ? celdas(p.mapa, estado.dia).filter(c => c.p >= 0.05) : [];
  capas.celdas
    .selectAll("path")
    .data(datos)
    .join("path")
    .attr("d", c => zoom.ruta(caja(c.caja)))
    .attr("fill", c => color(c.p))
    .attr("fill-opacity", c => (c.lat < LAT_REGIONES ? 0.3 : 0.75));
  const niveles = z500 ? isolineas({ ...z500, z: z500.z[estado.dia] }) : [];
  capas.isolineas.selectAll("path").data(niveles).join("path").attr("class", "isolinea").attr("d", zoom.ruta);
  capas.etiquetas
    .selectAll("text")
    .data(etiquetasIsolineas(niveles))
    .join("text")
    .attr("class", "iso-etiqueta")
    .attr("x", d => d.xy[0])
    .attr("y", d => d.xy[1])
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .text(d => d.texto);

  const modeloEns = T.modelosEns[estado.modelo];
  const valida = legible(fechaValida(estado.fecha, estado.dia), { weekday: "long", day: "numeric", month: "long" });
  $("#zoom-leyenda").innerHTML = `<p><span class="leyenda" aria-hidden="true"></span> ${T.leyendaZoom}</p>
    <p><strong>${T.pasadaValidez(modeloEns, legible(estado.fecha), valida)}</strong></p>
    ${z500 ? "" : `<p class="aviso">${T.sinIsolineas}</p>`}
    <p>${T.ayudaIsolineas}</p>
    <p class="tenue">${T.avisoIsolineas(modeloEns)}</p>`;
  dibujarPanelZoom(region, otro, delOtro);
}

/** Lugar, probabilidad y Z500 medio del nodo de la rejilla más cercano al puntero. */
function infoCelda(e) {
  const caja = $("#info-celda");
  const ll = zoom.proyeccion?.invert(d3.pointer(e, svgZoom.node()));
  const m = estado.producto?.mapa;
  if (!ll || !m || !(ll[1] >= 20)) return (caja.hidden = true);
  const n = m.prob[0][0].length;
  const lat = Math.round(ll[1] / 2.5) * 2.5;
  const j = (((Math.round((ll[0] - m.lon0) / m.dlon) % n) + n) % n);
  const lon = m.lon0 + j * m.dlon;
  const i = m.lat.indexOf(lat);
  const iz = zoom.z500 ? zoom.z500.lat.indexOf(lat) : -1;
  const num = v => v.toLocaleString(T.locale);
  const lugar = `${num(lat)}°N ${num(Math.abs(lon))}°${lon < 0 ? T.oeste : "E"}`;
  const p = i >= 0 ? pct(m.prob[estado.dia][i][j] / 100) : "—";
  const z = iz >= 0 ? `${Math.round(zoom.z500.z[estado.dia][iz][j])} dam` : "—";
  caja.textContent = T.celdaInfo(lugar, p, z);
  caja.hidden = false;
  const r = caja.parentElement.getBoundingClientRect();
  caja.style.left = `${Math.max(4, Math.min(e.clientX - r.left + 12, r.width - caja.offsetWidth - 4))}px`;
  caja.style.top = `${e.clientY - r.top + 16}px`;
}

svgZoom.on("pointermove", infoCelda).on("pointerleave", () => ($("#info-celda").hidden = true));
$("#volver").addEventListener("click", salir);
$("#tarjetas").addEventListener("click", e => {
  const t = e.target.closest("[data-region]");
  if (t) entrar(t.dataset.region);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && estado.region) salir();
});
window.addEventListener("popstate", () => {
  // atrás y adelante del navegador, o el hash editado a mano
  const h = leerHash(location.hash);
  estado.region = h.region;
  if (h.dia !== null) estado.dia = h.dia;
  pintarControles();
  dibujar();
});

// ---------- verificación ----------
async function dibujarVerificacion() {
  const caja = $("#verificacion-contenido");
  let v;
  try {
    v = await leer(`${BASE}/verificacion.json`);
  } catch {
    v = { pasadas: {} };
  }
  if (!v.primario?.length) {
    caja.innerHTML = `<p class="tenue">${T.verificacionPendiente}</p>`;
    return;
  }
  const filas = [];
  for (const m of Object.keys(MODELOS)) {
    for (const s of ["EA", "PA"]) {
      const datos = v.primario.filter(x => x.modelo === m && x.sector === s).sort((a, b) => a.paso - b.paso);
      if (!datos.length) continue;
      const celdasHtml = datos
        .map(
          x => `<span class="celda ${nivelBss(x)}" title="${T.verificacionCelda(x.paso, x.bss?.toFixed(2) ?? "–")}"></span>`
        )
        .join("");
      filas.push(`<span>${MODELOS[m]} · ${NOMBRES[s]}</span><span class="celdas">${celdasHtml}</span>`);
    }
  }
  const n = Object.entries(v.pasadas_completas ?? {})
    .map(([m, k]) => `${MODELOS[m]}: ${k}`)
    .join(" · ");
  caja.innerHTML = `<p class="tenue">${T.verificacionIntro(n)}</p>
    <div class="barras">${filas.join("")}</div>
    <p class="tenue" style="font-size:13px"><span class="chip" style="color:#2f9e44">${T.nivel.mejor}</span>
      <span class="chip habitual">${T.nivel.dudoso}</span>
      <span class="chip" style="color:#e8590c">${T.nivel.peor}</span></p>`;
}

// ---------- controles ----------
function pintarControles() {
  document.querySelectorAll(".modelo").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modelo === estado.modelo)));
  const fechas = [...(estado.indice?.modelos[estado.modelo] ?? [])].reverse();
  if (!fechas.includes(estado.fecha)) estado.fecha = fechas[0];
  $("#pasada").replaceChildren(...fechas.map(f => new Option(legible(f), f))); // nodos, no HTML con datos remotos
  if (estado.fecha) $("#pasada").value = estado.fecha;
  $("#dia").value = estado.dia;
  $("#dia-texto").textContent = estado.dia === 0 ? T.hoy : `+${estado.dia}`;
  $("#fecha-valida").textContent = estado.fecha
    ? `(${legible(fechaValida(estado.fecha, estado.dia), { weekday: "long", day: "numeric", month: "long" })})`
    : "";
}

async function cargarProducto() {
  pintarControles();
  if (!estado.fecha) return avisar(T.sinPasadas);
  avisar(T.cargando);
  try {
    estado.producto = await leer(`${BASE}/${estado.modelo}/${estado.fecha}.json`);
    avisar(
      estado.producto.historia_incompleta
        ? T.historiaIncompleta
        : ""
    );
  } catch {
    estado.producto = null;
    avisar(T.errorPasada);
  }
  dibujar();
  avisarAltura();
}

function dibujar() {
  $(".principal").hidden = Boolean(estado.region);
  $("#zoom").hidden = !estado.region;
  dibujarMapa();
  dibujarTarjetas();
  if (estado.region) dibujarZoom();
}

function redibujarDia() {
  pintarControles();
  if (estado.region) {
    history.replaceState(null, "", `${location.pathname}${location.search}${escribirHash(estado)}`);
  }
  dibujar();
}

document.querySelectorAll(".modelo").forEach(b =>
  b.addEventListener("click", () => {
    estado.modelo = b.dataset.modelo;
    cargarProducto();
  })
);
$("#pasada").addEventListener("change", e => {
  estado.fecha = e.target.value;
  cargarProducto();
});
$("#dia").addEventListener("input", e => {
  estado.dia = Number(e.target.value);
  redibujarDia();
});
window.addEventListener("resize", avisarAltura);
new ResizeObserver(avisarAltura).observe(document.body); // entrar y salir del zoom, cargas asíncronas

await dibujarBase();
try {
  estado.indice = await leer(`${BASE}/index.json`);
} catch {
  avisar(T.errorDatos);
}
await cargarProducto();
if (!embed) await dibujarVerificacion();
avisarAltura();
