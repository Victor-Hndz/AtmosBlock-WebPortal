"""Depósito mensual en Zenodo de los datos de la previsión de bloqueos (archivo ENS, producto, ERA5 y verificación).

Un registro por año ("… (AAAA)"); cada mes se añade como versión nueva con los ficheros de ese mes (Zenodo conserva
los de las versiones anteriores). Por defecto deja un **borrador**: publicar crea un DOI que ya no se puede borrar,
así que solo se hace con --publicar. Con --sandbox usa sandbox.zenodo.org (para probar). El token va en ZENODO_TOKEN
(scopes deposit:write y deposit:actions). Autores y palabras clave, en metadatos.json.

Uso: python prediccion/zenodo/depositar.py --mes AAAA-MM --carpeta DIR [--sandbox] [--publicar]
"""
import argparse
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

AQUI = pathlib.Path(__file__).resolve().parent
REPO = "https://github.com/Victor-Hndz/AtmosBlock-WebPortal"
DESCRIPCION = """<p>Archivo diario abierto de la altura geopotencial de 500 hPa (Z500) de las previsiones por conjuntos
de ECMWF (IFS ENS y AIFS ENS, 50 miembros, pasada de 00 UTC, 0–360 h cada 24 h, hemisferio norte a 1,25°), con el
producto experimental de probabilidad de bloqueo atmosférico derivado de él (índice de Davini, eventos con el
seguimiento de blocktrack, sectores de Matsueda 2009), la verdad ERA5 a 00 UTC y los registros de su verificación
preregistrada. Generado automáticamente por AtmosBlock (<a href="{repo}">{repo}</a>). El producto diagnostica la
previsión de ECMWF; su habilidad se verifica aparte.</p>
<p>Contains modified ECMWF open data (CC-BY-4.0, https://www.ecmwf.int/en/forecasts/datasets/open-data) and
modified Copernicus Climate Change Service information (ERA5).</p>""".replace("{repo}", REPO)


def base(sandbox):
    return "https://sandbox.zenodo.org/api" if sandbox else "https://zenodo.org/api"


def titulo(anio):
    return f"AtmosBlock: archivo diario de Z500 de las previsiones por conjuntos de ECMWF y producto de bloqueo ({anio})"


def peticion(metodo, url, token, cuerpo=None, datos=None):
    """Petición a la API de Zenodo con el token; devuelve el JSON de la respuesta (o {})."""
    enviar, cabeceras = None, {"Authorization": f"Bearer {token}"}
    if cuerpo is not None:
        enviar, cabeceras["Content-Type"] = json.dumps(cuerpo).encode(), "application/json"
    elif datos is not None:
        enviar, cabeceras["Content-Type"] = datos, "application/octet-stream"
    with urllib.request.urlopen(urllib.request.Request(url, data=enviar, headers=cabeceras, method=metodo),
                                timeout=600) as r:
        texto = r.read()
    return json.loads(texto) if texto else {}


def borrador(api, token, anio):
    """El borrador donde añadir el mes: uno nuevo, una versión nueva del registro publicado o el borrador abierto."""
    t = titulo(anio)
    q = urllib.parse.urlencode({"q": f'title:"{t}"', "sort": "mostrecent", "size": 10})
    existentes = [d for d in peticion("GET", f"{api}/deposit/depositions?{q}", token)
                  if d.get("metadata", {}).get("title", d.get("title")) == t]
    if not existentes:
        return peticion("POST", f"{api}/deposit/depositions", token, cuerpo={})
    ultimo = existentes[0]
    if ultimo["state"] != "done":
        return peticion("GET", f"{api}/deposit/depositions/{ultimo['id']}", token)
    nueva = peticion("POST", f"{api}/deposit/depositions/{ultimo['id']}/actions/newversion", token)
    return peticion("GET", nueva["links"]["latest_draft"], token)


def metadatos(mes):
    extra = json.loads((AQUI / "metadatos.json").read_text(encoding="utf-8"))
    return {"upload_type": "dataset", "title": titulo(mes[:4]), "description": DESCRIPCION, "version": mes,
            "creators": extra["creators"], "keywords": extra["keywords"], "access_right": "open",
            "license": "cc-by-4.0",
            "related_identifiers": [{"identifier": REPO, "relation": "isSupplementedBy", "resource_type": "software"}]}


def main(argv=None, token=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--mes", required=True, help="AAAA-MM")
    p.add_argument("--carpeta", type=pathlib.Path, required=True)
    p.add_argument("--sandbox", action="store_true")
    p.add_argument("--publicar", action="store_true")
    a = p.parse_args(argv)
    token = os.environ.get("ZENODO_TOKEN", "") if token is None else token
    if not token:
        print("falta ZENODO_TOKEN", file=sys.stderr)
        return 2
    api = base(a.sandbox)
    d = borrador(api, token, a.mes[:4])
    ya = {(f.get("filename"), f.get("filesize")) for f in d.get("files", [])}
    for f in sorted(a.carpeta.iterdir()):
        if f.is_file() and (f.name, f.stat().st_size) not in ya:
            peticion("PUT", f"{d['links']['bucket']}/{urllib.parse.quote(f.name)}", token, datos=f.read_bytes())
    peticion("PUT", f"{api}/deposit/depositions/{d['id']}", token, cuerpo={"metadata": metadatos(a.mes)})
    if a.publicar:
        r = peticion("POST", f"{api}/deposit/depositions/{d['id']}/actions/publish", token)
        print(f"publicado: {r.get('doi')} {r.get('links', {}).get('html', '')}")
    else:
        print(f"borrador {d['id']} listo en {api.replace('/api', '')}/deposit/{d['id']} (sin publicar)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
