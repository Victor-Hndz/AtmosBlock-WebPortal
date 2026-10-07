"""PRD-506: resumen de puntuaciones sobre los registros de verificación (F5 preregistrado y variantes V1 y V2).

Primario: BSS de la ocupación del sector (B_S) por paso 1–15 en EA y PA, IFS y AIFS por separado, frente a la
climatología ERA5 1991–2020, sin las pasadas con historia incompleta; solo se afirma habilidad si el IC90 (bootstrap
por bloques de 16 pasadas consecutivas) excluye 0. Secundario, con FDR de Benjamini-Hochberg: resto de sectores y
LLB, V1, inicios (solo pasadas en calma según el producto; en V2, en calma-V2) y génesis; con < 10 sucesos
observados, solo recuentos. De la calma, lo que manda publicar F5-V2: pasadas en cada calma, fracción en que la
calma-V2 del producto y la de ERA5 difieren, fracción en calma-V2 también en calma (A) y frecuencia climatológica.
Además: ΔBS IFS − AIFS emparejado en el primario y desglose por estación cuando una estación tiene ≥ 90 pasadas.

Uso: python prediccion/verificacion/resumen.py --registros DIR --salida resumen.json [--climatologia FICHERO]
"""
import argparse
import json
import pathlib
import sys

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "producto"))
import producto  # noqa: E402
import puntuaciones as pu  # noqa: E402

PRIMARIOS = ("EA", "PA")
PASOS = range(1, 16)
MIN_SUCESOS = 10
MIN_ESTACION = 90
ESTACIONES = {"DEF": (12, 1, 2), "MAM": (3, 4, 5), "JJA": (6, 7, 8), "SON": (9, 10, 11)}


def _num(x):
    x = float(x)
    return None if not np.isfinite(x) else round(x, 6)


def _bss(p, o, c):
    ref = pu.brier(c, o)
    return pu.bss(pu.brier(p, o), ref) if ref > 0 else np.nan


def puntuar(k, o, c, m, n_rep=pu.REPLICAS):
    k, o, c = (np.asarray(x, float) for x in (k, o, c))
    fila = {"n": len(o), "sucesos": int(o.sum())}
    p = k / m
    reps = pu.bootstrap(_bss, p, o, c, n_rep=n_rep)
    reps = reps[np.isfinite(reps)]
    fiab, resol, incert = pu.murphy(p, o)
    lo, hi = pu.intervalo(reps) if len(reps) else (np.nan, np.nan)
    fila.update(bs=_num(pu.brier(p, o)), bs_justo=_num(pu.brier_justo(k, m, o)), bs_clim=_num(pu.brier(c, o)),
                bss=_num(_bss(p, o, c)), ic90=[_num(lo), _num(hi)], p=_num(pu.p_valor(reps)) if len(reps) else None,
                fiabilidad=_num(fiab), resolucion=_num(resol), incertidumbre=_num(incert),
                roc=_num(pu.area_roc(p, o)) if 0 < o.sum() < len(o) else None)
    return fila


def _series(ap, var, obs, clim, **sel):
    """ap: registros apilados en la dimensión "pasada"; devuelve (k, suceso observado, climatología)."""
    return ap[var].sel(sel).values, (ap[obs].sel(sel).values > 0).astype(float), ap[clim].sel(sel).values


def _apilar(regs):
    regs = sorted(regs, key=lambda r: r.attrs["fecha"])
    ap = xr.concat(regs, "pasada", coords="minimal", compat="override", join="override")
    return ap.assign_coords(fecha=("pasada", [r.attrs["fecha"] for r in regs]))


def calma_climatologica(ruta):
    """{sector: {estación: frecuencia de la calma-V2 en ERA5 1991–2020}}, o None sin el fichero."""
    if not pathlib.Path(ruta).exists():
        return None
    with xr.open_dataset(ruta) as c:
        f = c["frecuencia_calma_v2_estacion"].load()
    return {str(s): {str(e): _num(f.sel(sector=s, estacion=e)) for e in f.estacion.values} for s in f.sector.values}


def resumir(registros, n_rep=pu.REPLICAS, calma_clim=None):
    modelos = sorted({r.attrs["modelo"] for r in registros})
    por_modelo = {m: _apilar([r for r in registros if r.attrs["modelo"] == m]) for m in modelos}
    completas = {m: ap.isel(pasada=ap["historia_incompleta"].values == 0) for m, ap in por_modelo.items()}
    sectores = list(producto.sectores.SECTORES)
    principales = list(producto.sectores.PRINCIPALES)
    salida = {"preregistro": producto.PREREGISTRO, "pasadas": {m: ap.sizes["pasada"] for m, ap in por_modelo.items()},
              "pasadas_completas": {m: ap.sizes["pasada"] for m, ap in completas.items()},
              "primario": [], "secundario": [], "ifs_menos_aifs": [], "por_estacion": [], "calma": [],
              "calma_v2_climatologia": calma_clim}

    def fila(ap, var, obs, clim, **sel):
        return puntuar(*_series(ap, var, obs, clim, **sel), int(ap["miembros"].values[0]), n_rep)

    for m, ap in completas.items():
        for s in PRIMARIOS:
            for paso in PASOS:
                f = fila(ap, "k", "obs", "clim", sector=s, paso=paso)
                f["habilidad"] = f["ic90"][0] is not None and f["ic90"][0] > 0
                salida["primario"].append({"modelo": m, "sector": s, "paso": paso, **f})
        meses = np.array([int(f[5:7]) for f in ap["fecha"].values])
        for est, de in ESTACIONES.items():
            de_est = ap.isel(pasada=np.isin(meses, de))
            if de_est.sizes["pasada"] >= MIN_ESTACION:
                for s in PRIMARIOS:
                    for paso in PASOS:
                        salida["por_estacion"].append({"modelo": m, "estacion": est, "sector": s, "paso": paso,
                                                       **fila(de_est, "k", "obs", "clim", sector=s, paso=paso)})

    secundario = []
    for m, ap in por_modelo.items():
        for s in sectores:
            for paso in PASOS:
                if s not in PRIMARIOS:
                    secundario.append(({"familia": "ocupacion", "modelo": m, "sector": s, "paso": paso},
                                       ap, ("k", "obs", "clim"), {"sector": s, "paso": paso}))
                if s in principales:
                    secundario.append(({"familia": "ocupacion_v1", "modelo": m, "sector": s, "paso": paso},
                                       ap, ("k_v1", "obs_v1", "clim_v1"), {"sector": s, "paso": paso}))
            a, v2, v2_era5 = (ap[x].sel(sector=s).values == 1 for x in ("calma", "calma_v2", "calma_v2_era5"))
            salida["calma"].append({"modelo": m, "sector": s, "pasadas": len(a), "en_calma": int(a.sum()),
                                    "en_calma_v2": int(v2.sum()), "v2_difiere_era5": _num((v2 != v2_era5).mean()),
                                    "v2_tambien_en_calma": _num((a & v2).sum() / v2.sum()) if v2.any() else None})
            for v in producto.VENTANAS:
                for familia, en, clim in (("inicio", a, "clim_inicio"), ("inicio_v2", v2, "clim_inicio_v2")):
                    secundario.append(({"familia": familia, "modelo": m, "sector": s, "ventana": v}, ap.isel(pasada=en),
                                       ("k_inicio", "obs_inicio", clim), {"sector": s, "ventana": v}))
                for regla in producto.REGLAS:
                    if regla == "F3-4-V1" and s not in principales:
                        continue  # en los LLB la regla V1 es la firmada
                    secundario.append(({"familia": f"genesis_{regla}", "modelo": m, "sector": s, "ventana": v},
                                       ap, ("k_genesis", "obs_genesis", "clim_genesis"),
                                       {"regla": regla, "sector": s, "ventana": v}))
    for clave, ap, (var, obs, clim), sel in secundario:
        k, o, c = _series(ap, var, obs, clim, **sel)
        if o.sum() < MIN_SUCESOS:
            salida["secundario"].append({**clave, "n": len(o), "sucesos": int(o.sum()), "solo_recuentos": True,
                                         "bss": None})
        else:
            salida["secundario"].append({**clave, "solo_recuentos": False,
                                         **puntuar(k, o, c, int(ap["miembros"].values[0]), n_rep)})
    con_p = [x for x in salida["secundario"] if not x["solo_recuentos"] and x["p"] is not None]
    for x, rechazo in zip(con_p, pu.fdr([x["p"] for x in con_p]) if con_p else []):
        x["fdr"] = bool(rechazo)
    for x in salida["secundario"]:
        if not x["solo_recuentos"]:
            x.setdefault("fdr", False)

    if {"ifs", "aifs"} <= set(completas):
        comunes = sorted(set(completas["ifs"]["fecha"].values) & set(completas["aifs"]["fecha"].values))
        ifs, aifs = (completas[m].isel(pasada=np.isin(completas[m]["fecha"].values, comunes)) for m in ("ifs", "aifs"))
        mi, ma = int(ifs["miembros"].values[0]), int(aifs["miembros"].values[0])
        dif = lambda a, b, y: pu.brier(a, y) - pu.brier(b, y)  # noqa: E731
        for s in PRIMARIOS:
            for paso in PASOS:
                ki, o, _ = _series(ifs, "k", "obs", "clim", sector=s, paso=paso)
                ka, _, _ = _series(aifs, "k", "obs", "clim", sector=s, paso=paso)
                reps = pu.bootstrap(dif, ki / mi, ka / ma, o, n_rep=n_rep)
                lo, hi = pu.intervalo(reps)
                salida["ifs_menos_aifs"].append({"sector": s, "paso": paso, "n": len(o),
                                                 "dbs": _num(dif(ki / mi, ka / ma, o)), "ic90": [_num(lo), _num(hi)],
                                                 "p": _num(pu.p_valor(reps))})
    return salida


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--registros", type=pathlib.Path, required=True)
    p.add_argument("--salida", type=pathlib.Path, required=True)
    p.add_argument("--climatologia", type=pathlib.Path, default=AQUI / "climatologia_era5_1991_2020.nc")
    a = p.parse_args(argv)
    regs = [xr.load_dataset(f) for f in sorted(a.registros.glob("verificacion_*_*.nc"))]
    salida = resumir(regs, calma_clim=calma_climatologica(a.climatologia)) if regs else {"pasadas": {}}
    a.salida.write_text(json.dumps(salida, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
