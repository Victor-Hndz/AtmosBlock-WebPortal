"""F5 y F5-V1: discrepancia entre el catálogo continuo de la climatología y la verdad por ventanas, en ERA5 1991–2020.

La climatología (climatologia.py) aproxima la verdad de cada pasada, que solo ve su ventana [d−4, d+15] (verdad.py), con
un catálogo continuo de 30 años y la regla de censura. F5 manda medir y publicar esa discrepancia: aquí se calculan las
dos sobre los mismos días de ERA5. Por magnitud (ocupación del sector, V1, inicio con la calma (A) y con la calma-V2,
génesis), sector, paso o ventana y periodo (estación del día de la pasada, y anual): frecuencia con cada método,
desacuerdo en cada sentido, error de referencia BS(clim_catálogo, o) − BS(clim_ventanas, o), con o la verdad por
ventanas y la climatología de ventanas hecha igual (±15 días del calendario, en la misma muestra), y desviación típica
entre años del sesgo f_ventanas − f_catálogo. La calma (A) y la calma-V2 salen de la misma DAV instantánea con los dos
métodos: si difieren es un error y se para. Es un descriptivo: la referencia del BSS sigue siendo la firmada.

Uso: python prediccion/verificacion/discrepancia.py --era5 DIR --salida discrepancia_catalogo_1991_2020.json
"""
import argparse
import json
import pathlib
import sys

import numpy as np

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import climatologia as cl  # noqa: E402
import dav  # noqa: E402
import producto  # noqa: E402
import puntuaciones as pu  # noqa: E402
import verdad  # noqa: E402
from resumen import _num  # noqa: E402

NOMBRES = cl.NOMBRES
PRINCIPALES = list(producto.sectores.PRINCIPALES)
VENTANAS = list(producto.VENTANAS.values())


def _doy(fechas):
    return (fechas - fechas.astype("datetime64[Y]")).astype(int) + 1


def _clim(o, fechas, peso=None):
    """Climatología de ±15 días del calendario de o (pasada, ...) en la fecha de cada pasada, entre las de peso 1."""
    peso = np.ones(o.shape) if peso is None else np.broadcast_to(peso, o.shape)
    cerca = cl._cerca(fechas, cl.MEDIO_ANCHO).astype(float)  # (día del año, pasada)
    plano = lambda x: x.reshape(len(x), -1).astype(float)  # noqa: E731
    with np.errstate(invalid="ignore", divide="ignore"):
        f = (cerca @ plano(o * peso)) / (cerca @ plano(peso))
    return f[_doy(fechas) - 1].reshape(o.shape)


def _por_ventana(x, eje=-1):
    """Primer paso x (−1: ninguno) → (..., ventana): cae en los días 1–5 o 6–10."""
    return np.stack([(x >= a) & (x <= b) for a, b in VENTANAS], axis=eje)


def pares(z):
    """z: ERA5 diario a 00 UTC (time, latitude, longitude) en m. Para cada pasada con su ventana dentro de la serie y
    cada magnitud, el suceso con los dos métodos y sus climatologías: (pasada, sector, paso o ventana); génesis con
    (pasada, regla, sector, ventana). Además, las fechas de las pasadas y sus calmas (pasada, sector)."""
    z = dav.a_2p5(z).load()
    dias = z.time.values.astype("datetime64[D]")
    cat = cl.catalogo(dav.mascara(z).values, tramo=365)
    d = np.arange(verdad.HISTORIA, len(dias) - verdad.PASOS + 1)
    ven = {x: [] for x in ("bloqueado", "bloqueado_v1", "inicio", "genesis", "calma", "calma_v2")}
    for i in d:
        v = verdad.verdad(z.isel(time=slice(i - verdad.HISTORIA, i + verdad.PASOS)), dias[i])
        for x in ven:
            ven[x].append(v[x].values)
    ven = {x: np.stack(a) for x, a in ven.items()}
    for x in ("calma", "calma_v2"):
        if not (ven[x] == cat[x][:, d].T).all():
            raise AssertionError(f"{x} distinta en el catálogo y en las ventanas: es la misma DAV instantánea")

    s = np.arange(verdad.PASOS)
    validez = d[:, None] + s[None, :]
    censurado = lambda b: b[np.maximum(0, s - cl.PASO_LIBRE)[None, :], :, validez].transpose(0, 2, 1)  # noqa: E731
    en_paso = lambda p: p[:, s[None, :], _doy(dias[validez]) - 1].transpose(1, 0, 2)  # noqa: E731
    ocupacion, ocupacion_v1 = censurado(cat["bloqueado"]), censurado(cat["bloqueado_v1"])
    primero = np.where(ocupacion.any(axis=2), ocupacion.argmax(axis=2), -1)
    gen = cat["genesis"] > 0
    gen = np.stack([np.stack([gen[:, :, d + o] for o in range(a, b + 1)]).any(axis=0) for a, b in VENTANAS], axis=-1)
    hoy = _doy(dias[d]) - 1

    def clim_por_paso(o):
        return np.stack([_clim(o[:, :, j], dias[validez[:, j]]) for j in s], axis=2)

    inicio_ven = _por_ventana(ven["inicio"])
    salida = {"dias": dias[d], "calma": ven["calma"] == 1, "calma_v2": ven["calma_v2"] == 1,
              "ocupacion": {"catalogo": ocupacion, "ventanas": ven["bloqueado"],
                            "clim_catalogo": en_paso(cl.prob_bloqueo(cat["bloqueado"], dias)),
                            "clim_ventanas": clim_por_paso(ven["bloqueado"])},
              "ocupacion_v1": {"catalogo": ocupacion_v1, "ventanas": ven["bloqueado_v1"],
                               "clim_catalogo": en_paso(cl.prob_bloqueo(cat["bloqueado_v1"], dias)),
                               "clim_ventanas": clim_por_paso(ven["bloqueado_v1"])},
              "genesis": {"catalogo": gen.transpose(2, 0, 1, 3),
                          "ventanas": (np.stack([ven["genesis"][..., a:b + 1] for a, b in VENTANAS], axis=-1) > 0
                                       ).any(axis=-2),
                          "clim_catalogo": cl.prob_genesis(cat["genesis"], dias)[0][..., hoy].transpose(3, 0, 1, 2)}}
    salida["genesis"]["clim_ventanas"] = _clim(salida["genesis"]["ventanas"], dias[d])
    for nombre, calma in (("inicio", "calma"), ("inicio_v2", "calma_v2")):
        salida[nombre] = {"catalogo": _por_ventana(primero), "ventanas": inicio_ven,
                          "clim_catalogo": cl.prob_inicio(cat["bloqueado"], cat[calma], dias)[0][..., hoy].transpose(
                              2, 0, 1),
                          "clim_ventanas": _clim(inicio_ven, dias[d], salida[calma][..., None])}
    return salida


def metricas(cat, ven, clim_cat, clim_ven, anios):
    """Una fila: arrays 1-D con las pasadas del estrato."""
    if not len(cat):
        return {"n": 0}
    cat, ven = cat.astype(bool), ven.astype(bool)
    sesgos = [ven[anios == a].mean() - cat[anios == a].mean() for a in np.unique(anios)]
    return {"n": len(cat), "f_catalogo": _num(cat.mean()), "f_ventanas": _num(ven.mean()),
            "sesgo": _num(ven.mean() - cat.mean()), "cat1_ven0": _num((cat & ~ven).mean()),
            "cat0_ven1": _num((~cat & ven).mean()),
            "error_referencia": _num(pu.brier(clim_cat, ven) - pu.brier(clim_ven, ven)),
            "sd_sesgo_entre_anios": _num(np.std(sesgos, ddof=1)) if len(sesgos) > 1 else None}


def filas(p):
    meses = p["dias"].astype("datetime64[M]").astype(int) % 12 + 1
    anios = p["dias"].astype("datetime64[Y]").astype(int) + 1970
    periodos = {"anual": np.ones(len(meses), bool), **{e: np.isin(meses, m) for e, m in cl.ESTACIONES.items()}}
    salida = []

    def fila(clave, x, idx, muestra=True):
        for periodo, en in periodos.items():
            en = en & muestra
            serie = (x[k][(en, *idx)] for k in ("catalogo", "ventanas", "clim_catalogo", "clim_ventanas"))
            salida.append({**clave, "periodo": periodo, **metricas(*serie, anios[en])})

    for j, sector in enumerate(NOMBRES):
        for paso in range(verdad.PASOS):
            fila({"magnitud": "ocupacion", "sector": sector, "paso": paso}, p["ocupacion"], (j, paso))
            if sector in PRINCIPALES:
                fila({"magnitud": "ocupacion_v1", "sector": sector, "paso": paso}, p["ocupacion_v1"], (j, paso))
        for w, ventana in enumerate(producto.VENTANAS):
            for magnitud, calma in (("inicio", "calma"), ("inicio_v2", "calma_v2")):
                fila({"magnitud": magnitud, "sector": sector, "ventana": ventana}, p[magnitud], (j, w),
                     p[calma][:, j])
            for r, regla in enumerate(producto.REGLAS):
                if regla == "F3-4-V1" and sector not in PRINCIPALES:
                    continue  # en los LLB la regla V1 es la firmada
                fila({"magnitud": f"genesis_{regla}", "sector": sector, "ventana": ventana}, p["genesis"], (r, j, w))
    return salida


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--era5", required=True, help="carpeta con geopot_500hPa_AAAA_00UTC_HN.nc de 1991 a 2020")
    p.add_argument("--salida", required=True)
    p.add_argument("--desde", type=int, default=1991)
    p.add_argument("--hasta", type=int, default=2020)
    a = p.parse_args(argv)
    salida = {"periodo": f"{a.desde}-{a.hasta}", "preregistro": producto.PREREGISTRO,
              "metodo": __doc__.split("\n\n")[1].replace("\n", " "),
              "filas": filas(pares(cl.cargar_era5(a.era5, a.desde, a.hasta)))}
    pathlib.Path(a.salida).write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
