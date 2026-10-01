"""PRD-303: producto probabilístico diario de bloqueo sobre la ENS archivada (F3 del preregistro firmado el 2026-09-29).

Por miembro, la serie de 20 días = pseudoanálisis de d−4…d−1 (media de los 50 miembros IFS en el paso 0 de la pasada
de cada día, común a IFS y AIFS) + los 16 pasos del miembro (F3-3). Sobre ella: DAV principal (dav.py) → eventos
(eventos.py) → sector bloqueado por paso (sectores.py, F3-4) → inicio y probabilidad de inicio en los días 1–5 y 6–10
si el sector está en calma (F3-5; calma = sin sector bloqueado en la DAV instantánea de la pseudoanálisis d−4…d,
aclaración del 2026-09-30). En los pasos 12–15 no aparecen bloqueos que empiecen después del paso 11: no les caben
5 días en la ventana (censura declarada). Si falta algún día de historia se usan los días seguidos disponibles y se
marca historia_incompleta. Nunca entra ERA5. B_S mide la ocupación del sector por eventos DAV.

Variante V1 (firmada el 2026-09-30, secundaria): sector bloqueado solo con las filas de 55–65°N (F3-4-V1) e inicio
por génesis (F3-5-V1): primer día de una etiqueta de evento que no aparece antes en la ventana, en los pasos 1…15, si
su huella cumple la regla de sector; se marca como nacida de una división si solapa la DAV del día anterior.

Producto experimental: diagnostica la previsión de ECMWF; su habilidad no está verificada (F5).

Uso: python prediccion/producto/producto.py --fecha AAAAMMDD --modelo ifs|aifs --archivo DIR --salida DIR
"""
import argparse
import datetime
import json
import os
import pathlib
import sys

import numpy as np
import xarray as xr

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "indice"))
import dav  # noqa: E402
import eventos  # noqa: E402
import sectores  # noqa: E402

DIAS_HISTORIA = 4
VENTANAS = {"dias_1_5": (1, 5), "dias_6_10": (6, 10)}
REGLAS = {"F3-4": False, "F3-4-V1": True}  # regla de sector de la génesis: ¿filas de 55–65°N?
GENESIS, GENESIS_DIVISION = 1, 2
UMBRAL_AVISO = 0.5  # solo para mostrar; la verificación usa la probabilidad entera (F3-5)
PREREGISTRO = ("F3 firmado el 2026-09-29; aclaración de F3-5 y variante V1 el 2026-09-30 "
               "(PLAN_PREDICCION_BLOQUEOS)")
ATRIBUCION = ("Contains modified ECMWF open data (IFS ENS / AIFS ENS), CC-BY-4.0: "
              "https://www.ecmwf.int/en/forecasts/datasets/open-data")
AVISO = "Producto experimental: diagnostica la previsión de ECMWF; su habilidad todavía no está verificada."


def genesis(et, dav, h):
    """et: etiquetas de evento (h+pasos, lat, lon); dav: DAV instantánea de la misma serie; h: días de historia.
    Devuelve (regla, sector, paso): 1 génesis, 2 génesis nacida de una división (solapa la DAV del día anterior)."""
    nombres = list(sectores.SECTORES)
    g = np.zeros((len(REGLAS), len(nombres), et.shape[0] - h), dtype=np.uint8)
    vistas = set(np.unique(et[:h + 1]).tolist())  # hasta el paso 0: el paso 0 no puede ser génesis
    for s in range(1, et.shape[0] - h):
        t = h + s
        for e in np.unique(et[t][et[t] > 0]):
            if e in vistas:
                continue
            huella = et[t] == e
            valor = GENESIS_DIVISION if (huella & (dav[t - 1] > 0)).any() else GENESIS
            for i, matsueda in enumerate(REGLAS.values()):
                for j, n in enumerate(nombres):
                    if sectores.sector_bloqueado(huella, n, matsueda):
                        g[i, j, s] = max(g[i, j, s], valor)
        vistas.update(np.unique(et[t]).tolist())
    return g


def calcular(z, historia, analisis_d):
    """z (number, step=16, lat, lon), historia (dia=H, lat, lon) de d−H…d−1 y analisis_d (lat, lon), en m a 2,5°."""
    z, historia, analisis_d = (dav.a_2p5(a).transpose(..., "latitude", "longitude") for a in (z, historia, analisis_d))
    h = historia.sizes["dia"]
    n, pasos = z.sizes["number"], z.sizes["step"]
    serie = np.concatenate([np.broadcast_to(historia.values, (n, *historia.shape)), z.values], axis=1)
    coords = {"latitude": z.latitude, "longitude": z.longitude}
    mascara = dav.mascara(xr.DataArray(serie, dims=("number", "dia", "latitude", "longitude"), coords=coords)).values
    et = [eventos.etiquetas_filtradas(mascara[m]) for m in range(n)]
    ev = np.stack([e > 0 for e in et])[:, h:]
    gen = np.stack([genesis(et[m], mascara[m], h) for m in range(n)], axis=2)  # (regla, sector, number, paso)
    pseudo = np.concatenate([historia.values, analisis_d.values[None]])
    instantanea = dav.mascara(xr.DataArray(pseudo, dims=("dia", "latitude", "longitude"), coords=coords)).values

    nombres = list(sectores.SECTORES)
    bloqueado = np.stack([sectores.sector_bloqueado(ev, s) for s in nombres])  # (sector, number, paso)
    inicio = np.where(bloqueado.any(axis=2), bloqueado.argmax(axis=2), -1)
    calma = np.array([not sectores.sector_bloqueado(instantanea.astype(bool), s).any() for s in nombres])
    prob_inicio = np.array([[((inicio[i] >= a) & (inicio[i] <= b)).mean() if calma[i] else np.nan
                             for a, b in VENTANAS.values()] for i in range(len(nombres))])
    fraccion = np.stack([sectores.fraccion_area(ev, s).mean(axis=0) for s in nombres])
    bloqueado_v1 = np.stack([sectores.sector_bloqueado(ev, s, matsueda=True) for s in nombres])
    prob_genesis = np.array([[[(gen[i, j][:, a:b + 1] > 0).any(axis=1).mean() for a, b in VENTANAS.values()]
                              for j in range(len(nombres))] for i in range(len(REGLAS))])

    paso = np.arange(pasos)
    return xr.Dataset(
        {"bloqueado": (("sector", "number", "paso"), bloqueado.astype("uint8")),
         "inicio": (("sector", "number"), inicio.astype("int8")),
         "prob_sector": (("sector", "paso"), bloqueado.mean(axis=1).astype("float32")),
         "fraccion_area": (("sector", "paso"), fraccion.astype("float32")),
         "calma": (("sector",), calma.astype("uint8")),
         "prob_inicio": (("sector", "ventana"), prob_inicio.astype("float32")),
         "bloqueado_v1": (("sector", "number", "paso"), bloqueado_v1.astype("uint8")),
         "prob_sector_v1": (("sector", "paso"), bloqueado_v1.mean(axis=1).astype("float32")),
         "genesis": (("regla", "sector", "number", "paso"), gen),
         "prob_genesis": (("regla", "sector", "ventana"), prob_genesis.astype("float32")),
         "prob_evento": (("paso", "latitude", "longitude"), ev.mean(axis=0).astype("float32")),
         "pseudoanalisis": (("dia", "latitude", "longitude"), pseudo.astype("float32")),
         "historia_incompleta": ((), np.uint8(h < DIAS_HISTORIA)),
         "dias_historia": ((), np.uint8(h))},
        coords={"sector": nombres, "number": z.number.values, "paso": paso, "ventana": list(VENTANAS),
                "regla": list(REGLAS),
                "dia": np.arange(-h, 1), "latitude": z.latitude.values, "longitude": z.longitude.values},
        attrs={"preregistro": PREREGISTRO, "version": os.environ.get("GITHUB_SHA", "local"),
               "indice": "DAV principal (Davini et al. 2012) + seguimiento y filtro de blocktrack v1.1",
               "censura": "pasos 12-15: no aparecen bloqueos que empiecen después del paso 11 (no les caben 5 días)",
               "atribucion": ATRIBUCION, "aviso": AVISO})


def resumen_json(ds, modelo, fecha):
    sect = {}
    for s in ds.sector.values:
        d = ds.sel(sector=s)
        calma = bool(d["calma"])
        prob = {v: (None if not calma else round(float(d["prob_inicio"].sel(ventana=v)), 3)) for v in VENTANAS}
        sect[str(s)] = {"probabilidad": [round(float(x), 3) for x in d["prob_sector"].values],
                        "fraccion_area": [round(float(x), 4) for x in d["fraccion_area"].values],
                        "calma": calma, "prob_inicio": prob,
                        "aviso_inicio": [v for v, p in prob.items() if p is not None and p >= UMBRAL_AVISO]}
    return {"modelo": modelo, "fecha": fecha, "pasada": "00 UTC", "pasos_dias": list(range(ds.sizes["paso"])),
            "historia_incompleta": bool(ds["historia_incompleta"]), "dias_historia": int(ds["dias_historia"]),
            "preregistro": ds.attrs["preregistro"], "version": ds.attrs["version"], "censura": ds.attrs["censura"],
            "aviso": AVISO, "atribucion": ATRIBUCION, "sectores": sect}


def mapa(ds, ruta, titulo):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    pasos = [p for p in (1, 5, 10, 15) if p < ds.sizes["paso"]]
    fig, ejes = plt.subplots(len(pasos), 1, figsize=(10, 2.6 * len(pasos)), constrained_layout=True)
    p = ds["prob_evento"].sel(latitude=slice(25, 80))
    for ax, s in zip(np.atleast_1d(ejes), pasos):
        im = ax.pcolormesh(p.longitude, p.latitude, p.sel(paso=s), vmin=0, vmax=1, cmap="Blues", shading="nearest")
        for nombre, (la0, la1, _, oeste, este) in sectores.SECTORES.items():
            for a, b in ([(oeste, este)] if oeste < este else [(oeste, 180), (-180, este)]):
                ax.plot([a, b, b, a, a], [la0, la0, la1, la1, la0], color="0.3", lw=0.7)
            ax.text(oeste + 1, la1 - 3.5, nombre, fontsize=7, color="0.3")
        ax.set_title(f"día {s}", fontsize=9, loc="left")
        ax.set_aspect("equal")
    fig.colorbar(im, ax=ejes, shrink=0.6, label="probabilidad de evento de bloqueo")
    fig.suptitle(f"{titulo} — experimental; sin costas. {ATRIBUCION}", fontsize=7)
    fig.savefig(ruta, dpi=110)
    plt.close(fig)


def _abrir(carpeta, modelo, fecha):
    ruta = pathlib.Path(carpeta) / f"z500_{modelo}_ens_{fecha:%Y%m%d}_00z_hn_1p25.nc"
    if not ruta.exists():
        return None
    with xr.open_dataset(ruta) as ds:
        return dav.a_2p5(ds["z500"]).load()


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--fecha", required=True)
    p.add_argument("--modelo", choices=("ifs", "aifs"), required=True)
    p.add_argument("--archivo", required=True, help="carpeta con los z500_*_hn_1p25.nc")
    p.add_argument("--salida", required=True)
    a = p.parse_args(argv)
    fecha = datetime.datetime.strptime(a.fecha, "%Y%m%d")

    z = _abrir(a.archivo, a.modelo, fecha)
    ifs_d = z if a.modelo == "ifs" else _abrir(a.archivo, "ifs", fecha)
    if z is None or ifs_d is None:
        print(f"falta el archivo de {a.modelo} o de ifs del {a.fecha}", file=sys.stderr)
        return 1
    historia = []
    for k in range(1, DIAS_HISTORIA + 1):  # días seguidos hacia atrás; el primero que falta corta la historia
        previo = _abrir(a.archivo, "ifs", fecha - datetime.timedelta(days=k))
        if previo is None:
            break
        historia.insert(0, previo.isel(step=0).mean("number"))
    hist = (xr.concat(historia, "dia") if historia
            else xr.DataArray(np.zeros((0, *ifs_d.shape[2:]), "float32"), dims=("dia", "latitude", "longitude"),
                              coords={"latitude": ifs_d.latitude, "longitude": ifs_d.longitude}))

    ds = calcular(z.transpose("number", "step", ...), hist, ifs_d.isel(step=0).mean("number"))
    ds.attrs.update(modelo=a.modelo, fecha=a.fecha)
    base = pathlib.Path(a.salida) / f"producto_{a.modelo}_{a.fecha}"
    base.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(base.with_suffix(".nc"), encoding={v: {"zlib": True, "complevel": 4} for v in ds.data_vars
                                                     if ds[v].ndim > 0})
    base.with_suffix(".json").write_text(json.dumps(resumen_json(ds, a.modelo, a.fecha), ensure_ascii=False, indent=1),
                                         encoding="utf-8")
    mapa(ds, base.with_suffix(".png"), f"{a.modelo.upper()} ENS {a.fecha} 00 UTC")
    return 0


if __name__ == "__main__":
    sys.exit(main())
