"""Genera tests/referencia_blocktrack.npz con DAV() de blocktrack v1.1 (6e4dc14) sin tocar, en los casos ERA5 del repo.

Solo se ejecuta la función DAV del fichero (el resto importa cartopy y matplotlib). Desde la raíz del repo:
python prediccion/indice/tests/generar_referencia.py <ruta a blocktoolbox.py> prediccion/indice/tests/referencia_blocktrack.npz
"""
import ast, sys, numpy as np, xarray as xr
src = open(sys.argv[1], encoding="utf-8").read()
fn = next(n for n in ast.parse(src).body if isinstance(n, ast.FunctionDef) and n.name == "DAV")
ns = {"np": np, "xr": xr}
exec(compile(ast.Module([fn], []), "blocktoolbox.py", "exec"), ns)
fx = "backend/FAST-IBAN_Project/execution/code/tests/fixtures/"
out = {}
for caso in ["geopot_500hPa_2022-03-14_00-06-12-18UTC.nc", "geopot_500hPa_2003-08-14-15_18-00UTC.nc"]:
    z = xr.open_dataset(fx + caso)["z"]
    t = "valid_time" if "valid_time" in z.dims else "time"
    z = z.sortby("latitude").sel(latitude=np.arange(0, 90.01, 2.5), longitude=np.arange(-180, 180, 2.5))
    ds = xr.Dataset({"zg": z.rename({t: "time", "latitude": "lat", "longitude": "lon"})})
    for filtro in (False, True):
        m = ns["DAV"](ds, mer_gradient_filter=filtro)["DAV"].values.astype(np.uint8)
        clave = caso[14:24] + ("_ghgs2" if filtro else "")
        out[clave] = m
        print(clave, m.shape, int(m.sum()))
np.savez_compressed(sys.argv[2], **out)
