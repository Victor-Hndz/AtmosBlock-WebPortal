import React, { JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PREDICCION_URL, VISOR_URL } from "@/consts/apiConsts";

/** prediccion/index.json de GitHub Pages (PRD-401) */
interface Indice {
  modelos: Record<Modelo, string[]>;
  /** Plantilla del PNG del release: {aaaa}, {mm}, {modelo}, {fecha} */
  png: string;
  atribucion: string;
}

/** JSON diario del producto (resumen_json de prediccion/producto/producto.py, PRD-303) */
interface Producto {
  modelo: Modelo;
  fecha: string;
  historia_incompleta: boolean;
  atribucion: string;
  sectores: Record<
    Sector,
    {
      probabilidad: number[];
      calma: boolean;
      prob_inicio: Record<Ventana, number | null>;
      aviso_inicio: Ventana[];
    }
  >;
}

/** prediccion/verificacion.json de GitHub Pages (resumen.py, PRD-506); vacío hasta que haya pasadas verificadas */
interface Verificacion {
  pasadas: Partial<Record<Modelo, number>>;
  pasadas_completas?: Partial<Record<Modelo, number>>;
  primario?: {
    modelo: Modelo;
    sector: Sector;
    paso: number;
    bss: number | null;
    ic90: (number | null)[];
    habilidad: boolean;
  }[];
}

type Modelo = "ifs" | "aifs";
const MODELOS: Record<Modelo, string> = { ifs: "IFS ENS", aifs: "AIFS ENS" };
const SECTORES = {
  GRL: "prediccion.sectores.GRL",
  EA: "prediccion.sectores.EA",
  URA: "prediccion.sectores.URA",
  PA: "prediccion.sectores.PA",
  NAM: "prediccion.sectores.NAM",
  "LLB-Atl": "prediccion.sectores.LLB-Atl",
  "LLB-Pac": "prediccion.sectores.LLB-Pac",
} as const;
type Sector = keyof typeof SECTORES;
const PRINCIPALES: Sector[] = ["GRL", "EA", "URA", "PA", "NAM"];
const BAJA_LATITUD: Sector[] = ["LLB-Atl", "LLB-Pac"];
const VENTANAS = { dias_1_5: "prediccion.ventanas.dias_1_5", dias_6_10: "prediccion.ventanas.dias_6_10" } as const;
type Ventana = keyof typeof VENTANAS;

const pct = (p: number) => `${Math.round(p * 100)} %`;
const urlPng = (plantilla: string, modelo: Modelo, fecha: string) =>
  plantilla
    .replace("{aaaa}", fecha.slice(0, 4))
    .replace("{mm}", fecha.slice(4, 6))
    .replace("{modelo}", modelo)
    .replace("{fecha}", fecha);
const fechaLegible = (f: string) => `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`;

/**
 * Previsión de bloqueos (PRD-402): probabilidad de bloqueo por sector y día de plazo en las previsiones por
 * conjuntos de ECMWF, leída de GitHub Pages. Producto experimental.
 */
const PrediccionPage: React.FC = (): JSX.Element => {
  const { t } = useTranslation();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [modelo, setModelo] = useState<Modelo>("ifs");
  const [fecha, setFecha] = useState<string>("");
  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState(false);
  const [verificacion, setVerificacion] = useState<Verificacion | null>(null);
  const [alturaVisor, setAlturaVisor] = useState(1200);

  useEffect(() => {
    // el visor incrustado avisa de su altura para no necesitar barra de desplazamiento propia
    const origen = new URL(VISOR_URL).origin;
    const alRecibir = (e: MessageEvent) => {
      if (e.origin === origen && e.data?.tipo === "atmosblock-altura" && Number.isFinite(e.data.altura)) {
        setAlturaVisor(Math.min(3000, Math.max(400, e.data.altura)));
      }
    };
    window.addEventListener("message", alRecibir);
    return () => window.removeEventListener("message", alRecibir);
  }, []);

  useEffect(() => {
    fetch(`${PREDICCION_URL}/index.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((i: Indice) => setIndice(i))
      .catch(() => setError(true));
    fetch(`${PREDICCION_URL}/verificacion.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((v: Verificacion) => setVerificacion(v))
      .catch(() => setVerificacion(null)); // sin resumen publicado, la sección no se muestra
  }, []);

  const fechas = indice ? [...indice.modelos[modelo]].reverse() : [];
  // siempre un elemento del índice, no el valor del desplegable (CodeQL js/xss-through-dom)
  const fechaActiva = fechas[Math.max(0, fechas.indexOf(fecha))];
  const srcVisor = (() => {
    const url = new URL(VISOR_URL);
    url.searchParams.set("embed", "1");
    url.searchParams.set("modelo", modelo === "aifs" ? "aifs" : "ifs");
    if (/^\d{8}$/.test(fechaActiva ?? "")) url.searchParams.set("fecha", fechaActiva);
    return url.toString();
  })();

  useEffect(() => {
    if (!fechaActiva) return;
    setProducto(null);
    fetch(`${PREDICCION_URL}/${modelo}/${fechaActiva}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: Producto) => setProducto(p))
      .catch(() => setError(true));
  }, [modelo, fechaActiva]);

  const filas = (sectores: Sector[]) =>
    producto &&
    sectores.map(s => (
      <tr key={s}>
        <th scope="row" className="px-2 py-1 text-left font-medium whitespace-nowrap">
          {t(SECTORES[s])}
        </th>
        {producto.sectores[s].probabilidad.map((p, dia) => (
          <td
            key={dia}
            className="px-1 py-1 text-center text-xs tabular-nums"
            style={{ backgroundColor: `rgba(37, 99, 235, ${p})`, color: p > 0.55 ? "white" : undefined }}
          >
            {pct(p)}
          </td>
        ))}
      </tr>
    ));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 text-slate-900">{t("prediccion.titulo")}</h1>
      <p className="text-slate-600 mb-4">{t("prediccion.descripcion")}</p>
      <p role="note" className="mb-6 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {t("prediccion.experimental")}
      </p>

      {error && <p role="alert">{t("prediccion.error")}</p>}
      {!error && !indice && <p>{t("prediccion.cargando")}</p>}
      {indice && fechas.length === 0 && <p>{t("prediccion.sinDatos")}</p>}

      {indice && fechas.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          <label className="flex items-center gap-2">
            {t("prediccion.modelo")}
            <select
              className="border rounded px-2 py-1"
              value={modelo}
              onChange={e => setModelo(e.target.value as Modelo)}
            >
              {(Object.keys(MODELOS) as Modelo[]).map(m => (
                <option key={m} value={m}>
                  {MODELOS[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            {t("prediccion.fecha")}
            <select className="border rounded px-2 py-1" value={fechaActiva} onChange={e => setFecha(e.target.value)}>
              {fechas.map(f => (
                <option key={f} value={f}>
                  {fechaLegible(f)} 00 UTC
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {fechaActiva && (
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-1">{t("prediccion.vistazo.titulo")}</h2>
          <p className="mb-3 text-slate-600">{t("prediccion.vistazo.texto")}</p>
          <iframe
            title={t("prediccion.vistazo.iframe")}
            src={srcVisor}
            className="w-full rounded-lg border border-slate-200"
            style={{ height: alturaVisor }}
            loading="lazy"
          />
          <a className="text-sm text-blue-700 underline" href={VISOR_URL} target="_blank" rel="noopener noreferrer">
            {t("prediccion.vistazo.abrir")}
          </a>
        </section>
      )}

      {producto && indice && (
        <>
          <h2 className="text-2xl font-semibold mb-3">{t("prediccion.detalle")}</h2>
          {producto.historia_incompleta && (
            <p className="mb-4 text-sm text-slate-700">{t("prediccion.historiaIncompleta")}</p>
          )}

          <h2 className="text-xl font-semibold mb-2">{t("prediccion.tablaTitulo")}</h2>
          <div className="overflow-x-auto mb-2">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1 text-left">
                    {t("prediccion.sector")}
                  </th>
                  {producto.sectores[PRINCIPALES[0]].probabilidad.map((_, dia) => (
                    <th key={dia} scope="col" className="px-1 py-1 text-xs font-normal">
                      {t("prediccion.dia", { n: dia })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{filas(PRINCIPALES)}</tbody>
              <tbody>
                <tr>
                  <th colSpan={17} scope="rowgroup" className="px-2 pt-3 pb-1 text-left text-slate-600 font-medium">
                    {t("prediccion.bajaLatitud")}
                  </th>
                </tr>
                {filas(BAJA_LATITUD)}
              </tbody>
            </table>
          </div>
          <p className="mb-6 text-xs text-slate-500">{t("prediccion.censura")}</p>

          <h2 className="text-xl font-semibold mb-1">{t("prediccion.inicioTitulo")}</h2>
          <p className="mb-2 text-sm text-slate-600">{t("prediccion.inicioExplicacion")}</p>
          <ul className="mb-6 text-sm">
            {PRINCIPALES.map(s => {
              const d = producto.sectores[s];
              return (
                <li key={s}>
                  <strong>{t(SECTORES[s])}:</strong>{" "}
                  {d.calma
                    ? (Object.keys(VENTANAS) as Ventana[]).map(v => (
                        <span key={v} className={d.aviso_inicio.includes(v) ? "font-semibold text-red-700" : ""}>
                          {t(VENTANAS[v])} {pct(d.prob_inicio[v] ?? 0)}
                          {d.aviso_inicio.includes(v) && ` (${t("prediccion.aviso")})`}{" "}
                        </span>
                      ))
                    : t("prediccion.sinCalma")}
                </li>
              );
            })}
          </ul>

          <h2 className="text-xl font-semibold mb-2">{t("prediccion.mapaTitulo")}</h2>
          <img
            className="max-w-full mb-6"
            src={urlPng(indice.png, producto.modelo, producto.fecha)}
            alt={t("prediccion.mapaAlt", { modelo: MODELOS[producto.modelo], fecha: fechaLegible(producto.fecha) })}
          />
          <p className="text-xs text-slate-500">{producto.atribucion}</p>
        </>
      )}

      {verificacion && (
        <section className="mt-10">
          <h2 id="titulo-verificacion" className="text-xl font-semibold mb-1">
            {t("prediccion.verificacion.titulo")}
          </h2>
          <p className="mb-3 text-sm text-slate-600">{t("prediccion.verificacion.explicacion")}</p>
          {!verificacion.primario?.length ? (
            <p className="text-sm">{t("prediccion.verificacion.pendiente")}</p>
          ) : (
            <>
              <ul className="mb-2 text-sm">
                {(Object.keys(verificacion.pasadas) as Modelo[]).map(m => (
                  <li key={m}>
                    {MODELOS[m]}:{" "}
                    {t("prediccion.verificacion.pasadas", {
                      completas: verificacion.pasadas_completas?.[m] ?? 0,
                      total: verificacion.pasadas[m],
                    })}
                  </li>
                ))}
              </ul>
              <div className="overflow-x-auto mb-2">
                <table aria-labelledby="titulo-verificacion" className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="px-2 py-1 text-left">
                        {t("prediccion.sector")}
                      </th>
                      {Array.from({ length: 15 }, (_, i) => (
                        <th key={i} scope="col" className="px-1 py-1 text-xs font-normal">
                          {t("prediccion.dia", { n: i + 1 })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(MODELOS) as Modelo[]).flatMap(m =>
                      (["EA", "PA"] as Sector[]).map(s => {
                        const celdas = verificacion.primario!.filter(x => x.modelo === m && x.sector === s);
                        if (!celdas.length) return null;
                        return (
                          <tr key={`${m}-${s}`}>
                            <th scope="row" className="px-2 py-1 text-left font-medium whitespace-nowrap">
                              {MODELOS[m]} · {t(SECTORES[s])}
                            </th>
                            {celdas.map(x => (
                              <td
                                key={x.paso}
                                title={`IC90 [${x.ic90.map(v => v?.toFixed(2) ?? "–").join(", ")}]`}
                                className={`px-1 py-1 text-center text-xs tabular-nums ${x.habilidad ? "font-semibold text-emerald-700" : ""}`}
                              >
                                {x.bss === null ? "–" : `${x.bss.toFixed(2)}${x.habilidad ? "*" : ""}`}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mb-1 text-xs text-slate-500">{t("prediccion.verificacion.habilidad")}</p>
            </>
          )}
          <a className="text-xs text-blue-700 underline" href={`${PREDICCION_URL}/verificacion.json`}>
            {t("prediccion.verificacion.detalles")}
          </a>
        </section>
      )}
    </div>
  );
};

export default PrediccionPage;
