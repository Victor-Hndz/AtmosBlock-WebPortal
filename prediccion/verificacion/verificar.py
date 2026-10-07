"""PRD-504: registro de verificación de una pasada (F5 del preregistro, aclaración de F3-5 y variantes V1 y V2).

Cruza el producto de la pasada del día d (cuántos de los miembros dan cada suceso) con la verdad ERA5 de su ventana
d−4…d+15 (verdad.py, la misma función que el producto) y con la climatología 1991–2020 en la fecha de validez de
cada paso. Las puntuaciones se calculan después sobre el conjunto de registros. La muestra de inicios la decide la
calma del producto (pseudoanálisis), no la de ERA5, que se guarda solo como dato descriptivo; en V2, la calma-V2.
El inicio es el mismo en F3-5 y en V2: solo cambia qué pasadas son elegibles.

Uso: python prediccion/verificacion/verificar.py --fecha AAAAMMDD --modelo ifs|aifs --producto DIR --era5 DIR
     --climatologia FICHERO --salida DIR      (código 3 = falta ERA5 de la ventana: pendiente, no es un error)
"""
import argparse
import os
import pathlib
import sys

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "producto"))
import era5  # noqa: E402
import producto  # noqa: E402
import verdad  # noqa: E402

PENDIENTE = 3


def _dia_del_anio(fechas):
    fechas = np.asarray(fechas, "datetime64[D]")
    return (fechas - fechas.astype("datetime64[Y]")).astype(int) + 1


def _en_ventana(x, dim="paso"):
    """Para cada ventana (días 1–5 y 6–10), la reducción de x sobre esos pasos con any()."""
    return xr.concat([x.sel({dim: slice(a, b)}).any(dim) for a, b in producto.VENTANAS.values()],
                     dim="ventana").assign_coords(ventana=list(producto.VENTANAS))


def registro(prod, v, clim, d):
    """prod: producto de la pasada; v: verdad ERA5 (verdad.verdad); clim: climatología; d: fecha de la pasada."""
    d = np.datetime64(d, "D")
    pasos = prod.paso.values
    doy_validez = xr.DataArray(_dia_del_anio(d + pasos.astype("timedelta64[D]")) - 1, dims="paso")
    doy_pasada = int(_dia_del_anio([d])[0]) - 1
    en_paso = {"paso": xr.DataArray(pasos, dims="paso"), "dia_del_anio": doy_validez}

    def por_ventana(inicio):
        return xr.concat([(inicio >= a) & (inicio <= b) for a, b in producto.VENTANAS.values()],
                         dim="ventana").assign_coords(ventana=list(producto.VENTANAS))

    r = xr.Dataset({
        "miembros": prod.sizes["number"],
        "k": prod["bloqueado"].sum("number"),
        "obs": v["bloqueado"],
        "k_v1": prod["bloqueado_v1"].sum("number"),
        "obs_v1": v["bloqueado_v1"],
        "calma": prod["calma"],
        "calma_era5": v["calma"],
        "calma_v2": prod["calma_v2"],
        "calma_v2_era5": v["calma_v2"],
        "k_inicio": por_ventana(prod["inicio"]).sum("number"),
        "obs_inicio": por_ventana(v["inicio"]),
        "k_genesis": _en_ventana(prod["genesis"] > 0).sum("number"),
        "obs_genesis": xr.concat([v["genesis"].sel(paso=slice(a, b)).max("paso")
                                  for a, b in producto.VENTANAS.values()],
                                 dim="ventana").assign_coords(ventana=list(producto.VENTANAS)),
        "clim": clim["prob_bloqueo"].isel(en_paso).drop_vars("dia_del_anio"),
        "clim_v1": clim["prob_bloqueo_v1"].isel(en_paso).drop_vars("dia_del_anio"),
        "clim_inicio": clim["prob_inicio"].isel(dia_del_anio=doy_pasada).drop_vars("dia_del_anio"),
        "clim_inicio_v2": clim["prob_inicio_v2"].isel(dia_del_anio=doy_pasada).drop_vars("dia_del_anio"),
        "clim_genesis": clim["prob_genesis"].isel(dia_del_anio=doy_pasada).drop_vars("dia_del_anio"),
        "historia_incompleta": prod["historia_incompleta"],
    })
    for var in ("obs", "obs_v1", "calma", "calma_era5", "calma_v2", "calma_v2_era5", "obs_inicio", "obs_genesis",
                "historia_incompleta"):
        r[var] = r[var].astype("uint8")
    return r.assign_attrs(fecha=str(d), preregistro=producto.PREREGISTRO, version=os.environ.get("GITHUB_SHA", "local"),
                          verdad="ERA5 a 00 UTC (primera versión disponible, ERA5T)")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--fecha", required=True)
    p.add_argument("--modelo", choices=("ifs", "aifs"), required=True)
    p.add_argument("--producto", type=pathlib.Path, required=True)
    p.add_argument("--era5", type=pathlib.Path, required=True)
    p.add_argument("--climatologia", type=pathlib.Path, required=True)
    p.add_argument("--salida", type=pathlib.Path, required=True)
    a = p.parse_args(argv)
    d = np.datetime64(f"{a.fecha[:4]}-{a.fecha[4:6]}-{a.fecha[6:]}")
    dias = d + np.arange(-verdad.HISTORIA, verdad.PASOS).astype("timedelta64[D]")
    ficheros = [a.era5 / era5.nombre(str(x).replace("-", "")) for x in dias]
    faltan = [f.name for f in ficheros if not f.exists()]
    if faltan:
        print(f"pendiente: faltan {len(faltan)} días de ERA5 ({faltan[0]}…)")
        return PENDIENTE
    z = xr.concat([xr.open_dataset(f)["z500"].load() for f in ficheros], "time")
    with xr.open_dataset(a.producto / f"producto_{a.modelo}_{a.fecha}.nc") as prod, \
            xr.open_dataset(a.climatologia) as clim:
        r = registro(prod.load(), verdad.verdad(z, d), clim.load(), d).assign_attrs(modelo=a.modelo)
    a.salida.mkdir(parents=True, exist_ok=True)
    r.to_netcdf(a.salida / f"verificacion_{a.modelo}_{a.fecha}.nc")
    return 0


if __name__ == "__main__":
    sys.exit(main())
