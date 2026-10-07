// Textos del visor público (español e inglés). test_textos.mjs comprueba que los dos idiomas tienen las mismas claves.

export const TEXTOS = {
  es: {
    locale: "es-ES",
    tituloPagina: "AtmosBlock · Previsión de bloqueos",
    titulo: "¿Bloqueos atmosféricos a la vista?",
    entradilla:
      "Probabilidad de bloqueo en el hemisferio norte para los próximos 15 días, a partir de las 50 previsiones de cada uno de los dos sistemas de ECMWF: el físico (IFS) y el de inteligencia artificial (AIFS).",
    aviso:
      "<strong>Experimental.</strong> No es una predicción oficial: muestra lo que dicen las previsiones de ECMWF sobre los bloqueos, y todavía no se ha comprobado cuánto aciertan.",
    queEs: "¿Qué es un bloqueo atmosférico?",
    queEs1:
      "Un anticiclón que se queda quieto durante varios días en latitudes medias o altas y desvía las borrascas a su alrededor. Mientras dura, el tiempo se repite: detrás de muchas olas de calor y de frío, sequías e inundaciones persistentes hay un bloqueo.",
    queEs2:
      "Aquí se cuenta un bloqueo cuando el índice de Davini detecta un evento que dura al menos 5 días y ocupa una parte de la región. La probabilidad es la fracción de las 50 previsiones de cada sistema que lo muestran.",
    modelos: { ifs: "IFS (físico)", aifs: "AIFS (IA)" },
    previsionDel: "Previsión del",
    dia: "Día:",
    hoy: "hoy",
    mapaAria: "Mapa del hemisferio norte con la probabilidad de bloqueo",
    leyenda:
      "Probabilidad de que cada punto esté dentro de un bloqueo · las líneas marcan las cinco regiones. Más atenuados, al sur de 40°N, los bloqueos de baja latitud: el índice los detecta, pero no suelen frenar el flujo del oeste.",
    sinMapa: "Mapa no disponible para esta previsión",
    regiones: {
      GRL: "Groenlandia y Atlántico norte",
      EA: "Europa y Atlántico",
      URA: "Urales y Rusia",
      PA: "Pacífico norte",
      NAM: "Norteamérica",
    },
    cortos: { GRL: "Groenlandia", EA: "Europa", URA: "Urales", PA: "Pacífico", NAM: "Norteamérica" },
    habitual: "habitual",
    compara: { mas: "▲ más de lo habitual", menos: "▼ menos de lo habitual", habitual: "≈ lo habitual" },
    notaTarjeta: "Próximos 15 días · línea discontinua: lo habitual para la época",
    inicio: "Posible inicio de un bloqueo",
    ventanas: { dias_1_5: "días 1–5", dias_6_10: "días 6–10" },
    notaInicio: "Solo se calcula cuando la región lleva 5 días sin bloqueos grandes. Fracción de las 50 previsiones.",
    cargando: "Cargando…",
    sinPasadas: "Todavía no hay previsiones publicadas.",
    historiaIncompleta: "Aviso: a esta previsión le faltan días de historia; sus primeros días pueden quedarse cortos.",
    errorPasada: "No se ha podido cargar esta previsión.",
    errorDatos: "No se han podido cargar los datos de la previsión.",
    verificacionTitulo: "¿Aciertan estas previsiones?",
    verificacionPendiente:
      "Todavía no hay previsiones comprobadas. Cada previsión se compara con lo que realmente pasó (el reanálisis ERA5) cuando han transcurrido sus 15 días y han llegado esos datos, unos 20 días después. Las primeras comprobaciones llegarán hacia el 20 de octubre de 2026.",
    verificacionIntro: n =>
      `Comparación con lo habitual para la época, día a día del 1 al 15. Previsiones comprobadas: ${n}.`,
    verificacionCelda: (dia, bss) => `Día ${dia}: BSS ${bss}`,
    nivel: { mejor: "mejor que lo habitual (comprobado)", dudoso: "sin diferencia clara", peor: "peor que lo habitual" },
    pie: "Datos: previsiones abiertas de ECMWF (IFS ENS y AIFS ENS, CC-BY-4.0) y ERA5 de Copernicus C3S; costas de Natural Earth. Contains modified ECMWF open data and modified Copernicus Climate Change Service information.",
    enlaceDatos: "Datos en JSON",
    enlaceArchivo: "Archivo y mapas",
    enlaceCodigo: "Código (MIT)",
  },
  en: {
    locale: "en-GB",
    tituloPagina: "AtmosBlock · Blocking forecast",
    titulo: "Atmospheric blocking ahead?",
    entradilla:
      "Probability of blocking over the Northern Hemisphere for the next 15 days, from the 50 forecasts of each of ECMWF's two systems: the physics-based one (IFS) and the artificial-intelligence one (AIFS).",
    aviso:
      "<strong>Experimental.</strong> Not an official forecast: it shows what the ECMWF forecasts say about blocking, and how often they are right has not been checked yet.",
    queEs: "What is atmospheric blocking?",
    queEs1:
      "A high-pressure system that stays put for several days at mid or high latitudes and steers storms around it. While it lasts the weather repeats itself: many heatwaves, cold spells, droughts and persistent floods come with a block.",
    queEs2:
      "Here a block is counted when the Davini index detects an event lasting at least 5 days that covers part of the region. The probability is the share of each system's 50 forecasts that show it.",
    modelos: { ifs: "IFS (physics)", aifs: "AIFS (AI)" },
    previsionDel: "Forecast from",
    dia: "Day:",
    hoy: "today",
    mapaAria: "Map of the Northern Hemisphere with the probability of blocking",
    leyenda:
      "Probability that each point lies inside a block · the lines mark the five regions. Fainter, south of 40°N, low-latitude blocks: the index detects them, but they do not usually stop the westerly flow.",
    sinMapa: "Map not available for this forecast",
    regiones: {
      GRL: "Greenland and North Atlantic",
      EA: "Europe and Atlantic",
      URA: "Urals and Russia",
      PA: "North Pacific",
      NAM: "North America",
    },
    cortos: { GRL: "Greenland", EA: "Europe", URA: "Urals", PA: "Pacific", NAM: "North America" },
    habitual: "usual",
    compara: { mas: "▲ more than usual", menos: "▼ less than usual", habitual: "≈ as usual" },
    notaTarjeta: "Next 15 days · dashed line: what is usual for the time of year",
    inicio: "Possible onset of a block",
    ventanas: { dias_1_5: "days 1–5", dias_6_10: "days 6–10" },
    notaInicio: "Only computed when the region has had no large blocks for 5 days. Share of the 50 forecasts.",
    cargando: "Loading…",
    sinPasadas: "No forecasts have been published yet.",
    historiaIncompleta: "Note: this forecast lacks some days of history; its first days may fall short.",
    errorPasada: "This forecast could not be loaded.",
    errorDatos: "The forecast data could not be loaded.",
    verificacionTitulo: "Are these forecasts right?",
    verificacionPendiente:
      "No forecast has been checked yet. Each forecast is compared with what actually happened (the ERA5 reanalysis) once its 15 days have passed and those data have arrived, about 20 days later. The first checks will arrive around 20 October 2026.",
    verificacionIntro: n => `Compared with what is usual for the time of year, day by day from 1 to 15. Checked forecasts: ${n}.`,
    verificacionCelda: (dia, bss) => `Day ${dia}: BSS ${bss}`,
    nivel: { mejor: "better than usual (checked)", dudoso: "no clear difference", peor: "worse than usual" },
    pie: "Data: ECMWF open forecasts (IFS ENS and AIFS ENS, CC-BY-4.0) and Copernicus C3S ERA5; coastlines from Natural Earth. Contains modified ECMWF open data and modified Copernicus Climate Change Service information.",
    enlaceDatos: "Data in JSON",
    enlaceArchivo: "Archive and maps",
    enlaceCodigo: "Code (MIT)",
  },
};

/** El parámetro ?lang manda; si no hay, el idioma del navegador; por defecto, español. */
export function elegirIdioma(parametro, navegador) {
  if (parametro === "es" || parametro === "en") return parametro;
  return String(navegador ?? "").toLowerCase().startsWith("en") ? "en" : "es";
}
