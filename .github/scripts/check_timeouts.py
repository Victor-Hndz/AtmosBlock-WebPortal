#!/usr/bin/env python3
"""Cada job de .github/workflows declara timeout-minutes, y ninguno pasa de 120.

Sin él, un job colgado corre 6 h, el máximo de GitHub. Este repo es público y Actions no le cuesta nada, pero el plan
Free solo incluye 2.000 min/mes en repos privados: con unos cuantos cuelgues (o si el repo dejara de ser público) se
pasaría del límite.

Uso (desde la raíz del repo): python3 .github/scripts/check_timeouts.py
"""
import pathlib
import re
import sys

MAXIMO = 120

errores = []
for wf in sorted(pathlib.Path(".github/workflows").glob("*.y*ml")):
    jobs = wf.read_text(encoding="utf-8").split("\njobs:\n", 1)[1] + "\n"
    # cada job: su línea "  nombre:" y las que siguen sangradas 4 espacios o vacías
    for nombre, cuerpo in re.findall(r"^  ([\w-]+):\n((?:(?: {4}.*)?\n)*)", jobs, re.M):
        m = re.search(r"^    timeout-minutes: (\d+)", cuerpo, re.M)
        if not m:
            errores.append(f"{wf.name}: {nombre} sin timeout-minutes")
        elif int(m.group(1)) > MAXIMO:
            errores.append(f"{wf.name}: {nombre} con timeout-minutes {m.group(1)} > {MAXIMO}")

if errores:
    print("ERROR: jobs sin tiempo máximo razonable:")
    print("\n".join(f"  - {e}" for e in errores))
    sys.exit(1)

print(f"OK: todos los jobs con timeout-minutes ≤ {MAXIMO}")
