// PRD-508: visor público de la previsión de bloqueos (GitHub Pages). Lee prediccion/index.json, el JSON diario del
// producto y prediccion/verificacion.json. Con ?embed=1 solo muestra controles, mapa y tarjetas (para el portal).
/* global d3, topojson */
import { comparar, fechaValida, celdas, nivelBss } from "./logica.js";

const BASE = "prediccion";
const LAT_REGIONES = 40; // por debajo, bloqueos de baja latitud: se dibujan atenuados
const TIERRA = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json";
const NOMBRES = {
  GRL: "Groenlandia y Atlántico norte",
  EA: "Europa y Atlántico",
  URA: "Urales y Rusia",
  PA: "Pacífico norte",
  NAM: "Norteamérica",
};
const CORTOS = { GRL: "Groenlandia", EA: "Europa", URA: "Urales", PA: "Pacífico", NAM: "Norteamérica" };
const COMPARA = { mas: "▲ más de lo habitual", menos: "▼ menos de lo habitual", habitual: "≈ lo habitual" };
const MODELOS = { ifs: "IFS (físico)", aifs: "AIFS (IA)" };

const GIRO = -10; // Europa abajo en el centro
const params = new URLSearchParams(location.search);
const embed = params.has("embed");
if (embed) document.body.classList.add("embed");

const estado = {
  indice: null,
  modelo: params.get("modelo") === "aifs" ? "aifs" : "ifs",
  fecha: params.get("fecha"),
  dia: Math.min(15, Math.max(0, Number(params.get("dia") ?? 1) || 0)),
  producto: null,
};

const $ = s => document.querySelector(s);
const pct = p => `${Math.round(p * 100)} %`;
const legible = (f, opciones = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(`${f.length === 8 ? `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}` : f}T00:00:00Z`).toLocaleDateString(
    "es-ES",
    { timeZone: "UTC", ...opciones }
  );
const avisar = texto => ($("#estado").textContent = texto);

async function leer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

function avisarAltura() {
  if (embed && window.parent !== window) {
    window.parent.postMessage({ tipo: "atmosblock-altura", altura: document.documentElement.scrollHeight }, "*");
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
      const g = entra.append("g");
      g.append("path").attr("class", "sector");
      g.append("text").attr("class", "sector-nombre").attr("text-anchor", "middle");
      return g;
    })
    .each(function (s) {
      const g = d3.select(this);
      const forma = contornoSector(geo[s]);
      g.select("path").attr("d", ruta(forma));
      const { lat, lon } = geo[s];
      const este = lon[1] < lon[0] ? lon[1] + 360 : lon[1];
      const [x, y] = proyeccion([(lon[0] + este) / 2, lat[0] + 6]);
      g.select("text").attr("x", x).attr("y", y).text(CORTOS[s]);
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
        .text("Mapa no disponible para esta previsión");
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
      return `<article class="tarjeta">
        <h3>${nombre}</h3>
        <div class="cifras">
          <span class="prevista">${pct(prevista)}</span>
          ${normal === null ? "" : `<span class="tenue">habitual: ${pct(normal)}</span>`}
          ${c.clave in COMPARA ? `<span class="chip ${c.clave}">${COMPARA[c.clave]}</span>` : ""}
        </div>
        ${miniGrafica(d.probabilidad, d.normal, estado.dia)}
        <span class="tenue" style="font-size:12px">Próximos 15 días · línea discontinua: lo habitual para la época</span>
      </article>`;
    })
    .join("");
}

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
    caja.innerHTML = `<p class="tenue">Todavía no hay previsiones comprobadas. Cada previsión se compara con lo que
      realmente pasó (el reanálisis ERA5) cuando han transcurrido sus 15 días y han llegado esos datos, unos 20 días
      después. Las primeras comprobaciones llegarán hacia el 20 de octubre de 2026.</p>`;
    return;
  }
  const filas = [];
  for (const m of Object.keys(MODELOS)) {
    for (const s of ["EA", "PA"]) {
      const datos = v.primario.filter(x => x.modelo === m && x.sector === s).sort((a, b) => a.paso - b.paso);
      if (!datos.length) continue;
      const celdasHtml = datos
        .map(
          x => `<span class="celda ${nivelBss(x)}" title="Día ${x.paso}: BSS ${x.bss?.toFixed(2) ?? "–"}"></span>`
        )
        .join("");
      filas.push(`<span>${MODELOS[m]} · ${NOMBRES[s]}</span><span class="celdas">${celdasHtml}</span>`);
    }
  }
  const n = Object.entries(v.pasadas_completas ?? {})
    .map(([m, k]) => `${MODELOS[m]}: ${k}`)
    .join(" · ");
  caja.innerHTML = `<p class="tenue">Comparación con lo habitual para la época, día a día del 1 al 15. Previsiones
      comprobadas: ${n}.</p>
    <div class="barras">${filas.join("")}</div>
    <p class="tenue" style="font-size:13px"><span class="chip" style="color:#2f9e44">mejor que lo habitual
      (comprobado)</span> <span class="chip habitual">sin diferencia clara</span>
      <span class="chip" style="color:#e8590c">peor que lo habitual</span></p>`;
}

// ---------- controles ----------
function pintarControles() {
  document.querySelectorAll(".modelo").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modelo === estado.modelo)));
  const fechas = [...(estado.indice?.modelos[estado.modelo] ?? [])].reverse();
  if (!fechas.includes(estado.fecha)) estado.fecha = fechas[0];
  $("#pasada").innerHTML = fechas.map(f => `<option value="${f}">${legible(f)}</option>`).join("");
  if (estado.fecha) $("#pasada").value = estado.fecha;
  $("#dia").value = estado.dia;
  $("#dia-texto").textContent = estado.dia === 0 ? "hoy" : `+${estado.dia}`;
  $("#fecha-valida").textContent = estado.fecha
    ? `(${legible(fechaValida(estado.fecha, estado.dia), { weekday: "long", day: "numeric", month: "long" })})`
    : "";
}

async function cargarProducto() {
  pintarControles();
  if (!estado.fecha) return avisar("Todavía no hay previsiones publicadas.");
  avisar("Cargando…");
  try {
    estado.producto = await leer(`${BASE}/${estado.modelo}/${estado.fecha}.json`);
    avisar(
      estado.producto.historia_incompleta
        ? "Aviso: a esta previsión le faltan días de historia; sus primeros días pueden quedarse cortos."
        : ""
    );
  } catch {
    estado.producto = null;
    avisar("No se ha podido cargar esta previsión.");
  }
  dibujarMapa();
  dibujarTarjetas();
  avisarAltura();
}

function redibujarDia() {
  pintarControles();
  dibujarMapa();
  dibujarTarjetas();
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

await dibujarBase();
try {
  estado.indice = await leer(`${BASE}/index.json`);
} catch {
  avisar("No se han podido cargar los datos de la previsión.");
}
await cargarProducto();
if (!embed) await dibujarVerificacion();
avisarAltura();
