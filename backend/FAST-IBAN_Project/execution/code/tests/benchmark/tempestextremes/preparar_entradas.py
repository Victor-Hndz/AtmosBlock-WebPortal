"""ALG-207: entradas para medir TempestExtremes en las mismas condiciones que FAST-IBAN.

Genera en /s/te/entradas:
- <caso>_umbral.nc: z_threshold(time, latitude, longitude) = media + max(980, 1.5*sigma) sobre los pasos
  del propio caso, en m2 s-2. SOLO PARA TEMPORIZAR: no es una climatologia.
- <caso>_dec.nc: copia de z decodificada (float32, sin scale_factor/add_offset), por si TE no desempaqueta.
- largo_dia_XX.nc y largo_dia_XX_umbral.nc: el caso largo partido en 15 ficheros diarios (4 pasos cada uno).
- referencia_celdas.txt: celdas con z >= umbral en 25-85 N por paso (antes del filtro de area), para
  comprobar que TE lee los datos igual.
"""
import pathlib
import numpy as np
import netCDF4

SALIDA = pathlib.Path("/s/te/entradas")
SALIDA.mkdir(parents=True, exist_ok=True)
CASOS = {
    "fijo": "/src/backend/FAST-IBAN_Project/execution/code/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc",
    "largo": "/s/caso_largo/geopot_500hPa_2003-08-01-15_00-06-12-18UTC.nc",
}
COMENTARIO = "solo temporizacion (ALG-207), no climatologia: media + max(980, 1.5*sigma) sobre los pasos del propio fichero"


def copiar_coordenadas(origen, destino, indices_tiempo):
    for nombre in ("time", "latitude", "longitude"):
        dim = origen.dimensions[nombre]
        destino.createDimension(nombre, len(indices_tiempo) if nombre == "time" else len(dim))
        var_o = origen.variables[nombre]
        var_d = destino.createVariable(nombre, var_o.datatype, (nombre,))
        var_d.setncatts({k: var_o.getncattr(k) for k in var_o.ncattrs()})
        var_d[:] = var_o[indices_tiempo] if nombre == "time" else var_o[:]


def escribir(ruta, origen, indices_tiempo, nombre_var, datos, atributos):
    with netCDF4.Dataset(ruta, "w", format="NETCDF4") as destino:
        copiar_coordenadas(origen, destino, indices_tiempo)
        var = destino.createVariable(nombre_var, "f4", ("time", "latitude", "longitude"), zlib=False)
        var.setncatts(atributos)
        var[:] = datos


lineas = []
for caso, ruta in CASOS.items():
    with netCDF4.Dataset(ruta) as origen:
        origen.set_auto_maskandscale(True)
        z = origen.variables["z"][:].astype("f8").filled(np.nan) if np.ma.isMaskedArray(origen.variables["z"][:]) else origen.variables["z"][:].astype("f8")
        lats = origen.variables["latitude"][:]
        pasos = z.shape[0]
        media = z.mean(axis=0)
        sigma = z.std(axis=0)
        umbral = media + np.maximum(980.0, 1.5 * sigma)
        umbral_t = np.broadcast_to(umbral, z.shape).astype("f4")
        todos = list(range(pasos))

        escribir(SALIDA / f"{caso}_umbral.nc", origen, todos, "z_threshold", umbral_t,
                 {"units": "m**2 s**-2", "comment": COMENTARIO})
        escribir(SALIDA / f"{caso}_dec.nc", origen, todos, "z", z.astype("f4"),
                 {"units": "m**2 s**-2", "long_name": "Geopotential", "comment": "copia decodificada de z"})

        franja = (lats >= 25) & (lats <= 85)
        marcadas = ((z >= umbral)[:, franja, :]).reshape(pasos, -1).sum(axis=1)
        lineas.append(f"{caso}: pasos={pasos} celdas_franja={int(franja.sum()) * z.shape[2]} "
                      f"marcadas_por_paso={marcadas.tolist()} media={marcadas.mean():.1f}")

        if caso == "largo":
            for dia in range(pasos // 4):
                indices = list(range(dia * 4, dia * 4 + 4))
                escribir(SALIDA / f"largo_dia_{dia + 1:02d}.nc", origen, indices, "z", z[indices].astype("f4"),
                         {"units": "m**2 s**-2", "long_name": "Geopotential", "comment": "dia del caso largo, decodificado"})
                escribir(SALIDA / f"largo_dia_{dia + 1:02d}_umbral.nc", origen, indices, "z_threshold", umbral_t[indices],
                         {"units": "m**2 s**-2", "comment": COMENTARIO})

(SALIDA / "referencia_celdas.txt").write_text("\n".join(lineas) + "\n", encoding="utf-8")
print("\n".join(lineas))
print("ficheros:", len(list(SALIDA.glob("*.nc"))))
