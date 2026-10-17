#!/usr/bin/env python3
"""WEB-304 (V15): el módulo de ejecución corre con CPU, memoria y procesos limitados.

Uso (desde la raíz del repo):
    docker compose config --format json | python3 .github/scripts/check_compose_limites.py

Sin límites, una petición con muchos hilos o procesos MPI acapara el host entero.
"""
import json
import sys

SERVICIO = "execution_module"
LIMITES = ("cpus", "mem_limit", "pids_limit")

servicios = json.load(sys.stdin)["services"]

if SERVICIO not in servicios:
    errores = [f"{SERVICIO}: el servicio no existe en docker-compose.yml"]
else:
    errores = [f"{SERVICIO} sin {limite}" for limite in LIMITES if not servicios[SERVICIO].get(limite)]

if errores:
    print("ERROR: módulo de ejecución sin límites de recursos (V15):")
    print("\n".join(f"  - {e}" for e in errores))
    sys.exit(1)

print(f"OK: {SERVICIO} con {', '.join(f'{l}={servicios[SERVICIO][l]}' for l in LIMITES)}")
