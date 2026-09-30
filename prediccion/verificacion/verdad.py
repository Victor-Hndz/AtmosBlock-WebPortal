"""PRD-501: verdad ERA5 de la pasada del día d con la misma función que el producto (preregistro F3, F5).

ERA5 a 00 UTC en la ventana d−4…d+15 pasa por producto.calcular como único miembro, con ERA5 también como historia
(d−4…d−1) y como análisis del día d: mismo índice, mismos eventos, misma censura y misma regla de sector. La calma
resultante es la de la DAV instantánea de ERA5 en d−4…d, la que el preregistro usa en la climatología; la muestra de
pasadas verificadas la decide la calma de la pseudoanálisis del producto, no esta.
"""
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "producto"))
import producto  # noqa: E402

G = 9.80665
HISTORIA, PASOS = producto.DIAS_HISTORIA, 16


def verdad(z, d):
    """z: ERA5 (time, latitude, longitude) diario a 00 UTC, en m o en m²/s²; d: fecha de la pasada."""
    d = np.datetime64(d, "D")
    fechas = d + np.arange(-HISTORIA, PASOS) * np.timedelta64(1, "D")
    tiempos = z.time.values.astype("datetime64[D]")
    if not np.isin(fechas, tiempos).all():
        raise ValueError(f"faltan días de ERA5 en la ventana {fechas[0]}…{fechas[-1]}")
    z = z.sel(time=np.isin(tiempos, fechas))
    if float(z.isel(time=0).max()) > 10000:  # geopotencial
        z = z / G
    hist = z.isel(time=slice(0, HISTORIA)).rename(time="dia")
    miembro = z.isel(time=slice(HISTORIA, None)).rename(time="step").expand_dims(number=[0])
    ds = producto.calcular(miembro.assign_coords(step=np.arange(PASOS)), hist, z.isel(time=HISTORIA))
    return ds[["bloqueado", "inicio", "fraccion_area", "calma"]].isel(number=0).assign(
        evento=(ds["prob_evento"] > 0).astype("uint8")).assign_attrs(fecha=str(d), fuente="ERA5 00 UTC")
