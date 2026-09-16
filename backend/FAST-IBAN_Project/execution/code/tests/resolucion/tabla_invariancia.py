"""ALG-308: tabla de invariancia (Markdown) a partir de las ejecuciones de medir_invariancia.sh; guarda también un JSON por caso.

Uso: tabla_invariancia.py <salida de medir_invariancia.sh> <caso>:<pasos por día>...
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import iou_resolucion as iou  # noqa: E402

RUNS = sys.argv[1]
SALIDA = RUNS
CASOS = {c.rsplit(":", 1)[0]: int(c.rsplit(":", 1)[1]) for c in sys.argv[2:]}
VARIANTES = [("dec2", "0,5° decimado"), ("avg2", "0,5° promedio"), ("dec4", "1° decimado"), ("avg4", "1° promedio")]
FASES = [("candidatos", "MAX"), ("candidatos", "MIN"), ("clusters", "MAX"), ("clusters", "MIN"), ("formaciones", "bloqueo")]


def f(x, d=2):
    return "—" if x is None else f"{x:.{d}f}".replace(".", ",")


def metr(r, fase, tipo):
    return r[fase][tipo]


os.makedirs(SALIDA, exist_ok=True)
resultados = {}
for caso, pd in CASOS.items():
    ref = iou.leer_ejecucion(os.path.join(RUNS, caso, "ref"))
    comps = {"persistencia": iou.comparar(ref, ref, desfase=1, pasos_bloque=5 * pd)}
    for v, _ in VARIANTES:
        comps[v] = iou.comparar(ref, iou.leer_ejecucion(os.path.join(RUNS, caso, v)), pasos_bloque=5 * pd)
    resultados[caso] = comps
    with open(os.path.join(SALIDA, caso + ".json"), "w") as fp:
        json.dump({k: iou._a_json(copy.deepcopy(v)) for k, v in comps.items()}, fp, indent=1, sort_keys=True)
    print("hecho", caso, file=sys.stderr)

for caso, comps in resultados.items():
    pers = "24 h" if CASOS[caso] == 1 else "6 h"
    print(f"\n### {caso}\n")
    print(f"| Fase | Tipo | Persistencia {pers} | " + " | ".join(n for _, n in VARIANTES) + " |")
    print("|---|---|---|" + "---|" * len(VARIANTES))
    for fase, tipo in FASES:
        celdas = []
        for clave in ["persistencia"] + [v for v, _ in VARIANTES]:
            m = metr(comps[clave], fase, tipo)["total"]
            ic = m["ic95"]
            celdas.append(f"{f(m['iou'])} [{f(ic[0])}–{f(ic[1])}]" if ic else f(m["iou"]))
        print(f"| {fase} | {tipo} | " + " | ".join(celdas) + " |")
    print(f"\nPor bandas (IoU agregado; pasos con detección en 75–90°):\n")
    print("| Fase | Tipo | Comparación | 30–50 | 50–75 | 75–90 | pasos 75–90 | mediana/p10 por paso |")
    print("|---|---|---|---|---|---|---|---|")
    for fase, tipo in FASES:
        for clave, nombre in [("persistencia", "persistencia")] + VARIANTES:
            m = metr(comps[clave], fase, tipo)
            print(f"| {fase} | {tipo} | {nombre} | {f(m['30-50']['iou'])} | {f(m['50-75']['iou'])} | {f(m['75-90']['iou'])} | "
                  f"{m['75-90']['pasos']} | {f(m['total']['mediana_paso'])} / {f(m['total']['p10_paso'])} |")
    print("\nObjetos:\n")
    print("| Objetos | Comparación | n ref / deg | emparejados ref / deg | divisiones / fusiones | dist. mediana / p90 (km) |")
    print("|---|---|---|---|---|---|")
    for nombre_obj, sel in (("clusters MAX", lambda r: r["clusters"]["objetos"]["MAX"]), ("clusters MIN", lambda r: r["clusters"]["objetos"]["MIN"]),
                            ("formaciones", lambda r: r["formaciones"]["objetos"])):
        for clave, nombre in [("persistencia", "persistencia")] + VARIANTES:
            o = sel(comps[clave])
            print(f"| {nombre_obj} | {nombre} | {o['objetos_ref']} / {o['objetos_deg']} | {f(o['emparejados_ref'])} / {f(o['emparejados_deg'])} | "
                  f"{o['divisiones']} / {o['fusiones']} | {f(o['distancia_mediana_km'], 0)} / {f(o['distancia_p90_km'], 0)} |")
    print("\nConfusión de formaciones emparejadas (0,25° → degradado):\n")
    for clave, nombre in VARIANTES:
        conf = comps[clave]["formaciones"]["objetos"]["confusion"]
        print(f"- {nombre}: " + ", ".join(f"{a}→{b} {n}" for (a, b), n in sorted(conf.items())))
