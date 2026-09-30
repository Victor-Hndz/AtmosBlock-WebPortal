"""Genera tests/referencia_eventos.npz con ContourTracking2D + FilterEvents de blocktrack v1.1 (6e4dc14) sin tocar.

Solo se ejecutan las funciones de seguimiento del fichero (GPL-3.0; no se copia nada al repo). La entrada es la
máscara DAV de dav.py, idéntica a la de DAV() de blocktrack (test_dav.py). Desde la raíz del repo:
python prediccion/indice/tests/generar_referencia_eventos.py <blocktoolbox.py> <carpeta AtmosBlock-datos> <salida.npz>
"""
import ast
import pathlib
import sys

import numpy as np
import xarray as xr
from scipy.ndimage import center_of_mass, label
from tqdm import tqdm

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import dav  # noqa: E402

FUNCIONES = {"Area", "OrderIndexes", "CenterofMass", "ContourTracking2D", "FilterEvents"}
arbol = ast.parse(open(sys.argv[1], encoding="utf-8").read())
ns = {"np": np, "xr": xr, "label": label, "center_of_mass": center_of_mass, "tqdm": tqdm}
exec(compile(ast.Module([n for n in arbol.body if isinstance(n, ast.FunctionDef) and n.name in FUNCIONES], []),
             "blocktoolbox.py", "exec"), ns)

datos = pathlib.Path(sys.argv[2])
CASOS = {
    "rusia_2010": ("casos/geopot_500hPa_C2_rusia_2010_00UTC_HN.nc", None),
    "rusia_2010_ventana20": ("casos/geopot_500hPa_C2_rusia_2010_00UTC_HN.nc", slice("2010-07-10", "2010-07-29")),
    "invierno_1991": ("clima_HN/geopot_500hPa_1991_00UTC_HN.nc", slice("1991-01-01", "1991-03-31")),
}
out = {}
for nombre, (fichero, ventana) in CASOS.items():
    z = xr.open_dataset(datos / fichero)["z"]
    if ventana is not None:
        z = z.sel(time=ventana)
    z = dav.a_2p5(z / 9.80665).load()
    m = dav.mascara(z)
    ds = xr.Dataset({"DAV": m.rename(latitude="lat", longitude="lon").astype(float),
                     "zg": z.rename(latitude="lat", longitude="lon")})
    ds, dic = ns["ContourTracking2D"](ds)
    ds, dic = ns["FilterEvents"](ds, dic)
    eventos = (ds["DAV_tracked"].values > 0)
    out[nombre + "_dav"] = np.packbits(m.values.astype(bool))
    out[nombre + "_eventos"] = np.packbits(eventos)
    out[nombre + "_forma"] = np.array(m.shape)
    print(nombre, m.shape, "celdas DAV", int(m.values.sum()), "celdas evento", int(eventos.sum()), "eventos", len(dic))
np.savez_compressed(sys.argv[3], **out)
