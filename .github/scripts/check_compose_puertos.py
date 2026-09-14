#!/usr/bin/env python3
"""WEB-105 (V8): los servicios internos no publican puertos y Adminer solo existe con el perfil dev.

Uso (desde la raíz del repo):
    docker compose config --format json | python3 .github/scripts/check_compose_puertos.py

`docker compose config` sin `--profile` omite los servicios con perfil, así que Adminer no debe aparecer.
"""
import json
import sys

INTERNOS = ("postgres", "rabbitmq", "minio")

servicios = json.load(sys.stdin)["services"]
errores = []

for nombre in INTERNOS:
    if nombre not in servicios:
        errores.append(f"{nombre}: el servicio no existe en docker-compose.yml")
    elif servicios[nombre].get("ports"):
        publicados = [f"{p.get('published')}->{p.get('target')}" for p in servicios[nombre]["ports"]]
        errores.append(f"{nombre} publica puertos en el host: {', '.join(publicados)}")

if "adminer" in servicios:
    errores.append("adminer se levanta sin perfil: debe llevar profiles: [dev]")

if errores:
    print("ERROR: servicios internos expuestos (V8):")
    print("\n".join(f"  - {e}" for e in errores))
    sys.exit(1)

print(f"OK: {', '.join(INTERNOS)} sin puertos publicados; adminer solo con el perfil dev")
