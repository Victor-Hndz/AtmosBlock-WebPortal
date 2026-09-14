#!/usr/bin/env python3
"""WEB-104 (V4): ningún secreto se hornea en las imágenes Docker; los secretos llegan en tiempo de ejecución.

Uso (desde la raíz del repo):
    docker compose config --format json | python3 .github/scripts/check_imagen_sin_secretos.py .

Falla si:
  - algún servicio pasa como build arg una variable con KEY, SECRET, PASSWORD o TOKEN en el nombre;
  - algún Dockerfile declara esas variables con ARG o ENV, o escribe un .cdsapirc.
"""
import json
import pathlib
import re
import sys

SENSIBLE = re.compile(r"(KEY|SECRET|PASSWORD|TOKEN)", re.IGNORECASE)
DECLARACION = re.compile(r"^\s*(ARG|ENV)\s+([A-Za-z_][A-Za-z0-9_]*)", re.IGNORECASE)

raiz = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
errores = []

for nombre, servicio in json.load(sys.stdin)["services"].items():
    args = (servicio.get("build") or {}).get("args") or {}
    for arg in args:
        if SENSIBLE.search(arg):
            errores.append(f"docker-compose: {nombre} pasa el secreto {arg} como build arg")

for dockerfile in sorted(raiz.rglob("Dockerfile")):
    if "node_modules" in dockerfile.parts:
        continue
    for n, linea in enumerate(dockerfile.read_text(encoding="utf-8").splitlines(), start=1):
        declaracion = DECLARACION.match(linea)
        if declaracion and SENSIBLE.search(declaracion.group(2)):
            errores.append(f"{dockerfile.as_posix()}:{n}: {declaracion.group(1).upper()} {declaracion.group(2)}")
        elif ".cdsapirc" in linea and not linea.lstrip().startswith("#"):
            errores.append(f"{dockerfile.as_posix()}:{n}: escribe .cdsapirc en la imagen")

if errores:
    print("ERROR: secretos horneados en imágenes Docker (V4):")
    print("\n".join(f"  - {e}" for e in errores))
    sys.exit(1)

print("OK: ningún secreto en build args ni en Dockerfiles")
