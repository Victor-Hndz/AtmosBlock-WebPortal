"""PRD-503: climatología ERA5 1991–2020 de la verificación (preregistro F5 y aclaración de F3-5).

Catálogo continuo: DAV principal de ERA5 a 00 UTC → eventos (seguimiento y filtro de blocktrack) → sector bloqueado por
día, con la regla de censura de la ventana: para el paso s ≥ 12 solo cuentan los eventos que empezaron como tarde en
el día de validez − (s − 11), porque en la ventana [d−4, d+15] no les caben 5 días a los que empiezan después del
paso 11. La calma de un día es la de la aclaración de F3-5: ningún sector bloqueado en la DAV instantánea de ese día
ni de los 4 anteriores.

Probabilidad climatológica por sector, paso y día del año: frecuencia en 1991–2020 en los días a ±15 del día del
año (circular, periodo 365,25 días). La de inicio, condicionada a la calma del día de la pasada. Es una aproximación
de la verdad por ventanas: su discrepancia se mide y se publica en la verificación (F5).

Uso: python prediccion/verificacion/climatologia.py --era5 DIR --salida climatologia_era5_1991_2020.nc
"""
import argparse
import pathlib
import sys

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent / "indice"))
import dav  # noqa: E402
import eventos  # noqa: E402
import sectores  # noqa: E402

G = 9.80665
PASOS, PASO_LIBRE = 16, 11  # sin censura hasta el paso 11
K_MAX = PASOS - 1 - PASO_LIBRE  # 4
HISTORIA_CALMA = 5
VENTANAS = {"dias_1_5": (1, 5), "dias_6_10": (6, 10)}
MEDIO_ANCHO = 15
NOMBRES = list(sectores.SECTORES)


def _catalogo_tramo(m):
    et = eventos.etiquetas_filtradas(m)
    inicio = {}
    for t in range(len(et)):
        for e in np.unique(et[t][et[t] > 0]):
            inicio.setdefault(e, t)
    comienzo = np.full(et.shape, np.iinfo(np.int32).max, dtype=np.int32)
    for e, t in inicio.items():
        comienzo[et == e] = t
    dia = np.arange(len(et))[:, None, None]
    return np.stack([np.stack([sectores.sector_bloqueado((et > 0) & (comienzo <= dia - k), s) for s in NOMBRES])
                     for k in range(K_MAX + 1)])  # (k, sector, día)


def catalogo(m, tramo=None, solape=60):
    """m: DAV (días, 37, 144). Por tramos con solape: idéntico mientras ningún evento dure más que el solape."""
    m = np.asarray(m)
    n = len(m)
    if tramo is None:
        bloqueado = _catalogo_tramo(m)
    else:
        bloqueado = np.zeros((K_MAX + 1, len(NOMBRES), n), dtype=bool)
        for a in range(0, n, tramo):
            lo, hi = max(0, a - solape), min(n, a + tramo + solape)
            bloqueado[:, :, a:a + tramo] = _catalogo_tramo(m[lo:hi])[:, :, a - lo:a - lo + min(tramo, n - a)]
    inst = np.stack([sectores.sector_bloqueado(m.astype(bool), s) for s in NOMBRES])
    calma = np.zeros_like(inst)
    for d in range(HISTORIA_CALMA - 1, n):
        calma[:, d] = ~inst[:, d - HISTORIA_CALMA + 1:d + 1].any(axis=1)
    return {"bloqueado": bloqueado, "calma": calma}


def _cerca(dias, medio_ancho):
    """(366, días): el día del año c (1…366) está a ≤ medio_ancho del día (distancia circular de periodo 365,25)."""
    doy = (dias - dias.astype("datetime64[Y]")).astype(int) + 1
    dist = np.abs(np.arange(1, 367)[:, None] - doy[None, :])
    return np.minimum(dist, 365.25 - dist) <= medio_ancho


def prob_bloqueo(b, dias, medio_ancho=MEDIO_ANCHO):
    """b (k, sector, día) → (sector, paso, día del año)."""
    cerca = _cerca(np.asarray(dias, "datetime64[D]"), medio_ancho).astype(float)
    n = cerca.sum(axis=1)
    return np.stack([b[max(0, s - PASO_LIBRE)].astype(float) @ cerca.T / n for s in range(PASOS)], axis=1)


def prob_inicio(b, calma, dias, medio_ancho=MEDIO_ANCHO):
    """Probabilidad de que el primer paso bloqueado caiga en cada ventana, entre las pasadas en calma.
    Devuelve (sector, ventana, día del año) y el número de pasadas en calma (sector, día del año)."""
    t = b.shape[2] - (PASOS - 1)  # pasadas con los 16 pasos dentro de la serie
    serie = np.stack([b[max(0, s - PASO_LIBRE), :, s:s + t] for s in range(PASOS)], axis=2)  # (sector, pasada, paso)
    primero = np.where(serie.any(axis=2), serie.argmax(axis=2), -1)
    cerca = _cerca(np.asarray(dias, "datetime64[D]")[:t], medio_ancho).astype(float)
    en_calma = calma[:, :t].astype(float)
    n = en_calma @ cerca.T
    with np.errstate(invalid="ignore", divide="ignore"):
        p = np.stack([(en_calma * ((primero >= a) & (primero <= z))) @ cerca.T / n for a, z in VENTANAS.values()],
                     axis=1)
    return p, n


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--era5", required=True, help="carpeta con geopot_500hPa_AAAA_00UTC_HN.nc de 1991 a 2020")
    p.add_argument("--salida", required=True)
    p.add_argument("--desde", type=int, default=1991)
    p.add_argument("--hasta", type=int, default=2020)
    a = p.parse_args(argv)
    campos = []
    for anio in range(a.desde, a.hasta + 1):
        with xr.open_dataset(pathlib.Path(a.era5) / f"geopot_500hPa_{anio}_00UTC_HN.nc") as ds:
            campos.append((dav.a_2p5(ds["z"]) / G).load())
    z = xr.concat(campos, "time")
    dias = z.time.values.astype("datetime64[D]")
    if not (np.diff(dias) == np.timedelta64(1, "D")).all():
        raise ValueError("la serie de ERA5 no es diaria y continua")
    cat = catalogo(dav.mascara(z).values, tramo=365)
    pb = prob_bloqueo(cat["bloqueado"], dias)
    pi, n = prob_inicio(cat["bloqueado"], cat["calma"], dias)
    salida = xr.Dataset(
        {"prob_bloqueo": (("sector", "paso", "dia_del_anio"), pb.astype("float32")),
         "prob_inicio": (("sector", "ventana", "dia_del_anio"), pi.astype("float32")),
         "n_calma": (("sector", "dia_del_anio"), n.astype("int32")),
         "frecuencia_calma": (("sector",), cat["calma"].mean(axis=1).astype("float32"))},
        coords={"sector": NOMBRES, "paso": np.arange(PASOS), "ventana": list(VENTANAS),
                "dia_del_anio": np.arange(1, 367)},
        attrs={"periodo": f"{a.desde}-{a.hasta}", "fuente": "ERA5 a 00 UTC; Contains modified Copernicus Climate "
               "Change Service information", "preregistro": "F5 firmado el 2026-09-29; aclaración de F3-5 del "
               "2026-09-30", "ventana_calendario": f"±{MEDIO_ANCHO} días, circular de periodo 365,25",
               "tramos": "catálogo por años con 60 días de solape; los extremos de la serie no tienen días previos"})
    salida.to_netcdf(a.salida, encoding={v: {"zlib": True, "complevel": 4} for v in salida.data_vars})
    return 0


if __name__ == "__main__":
    sys.exit(main())
