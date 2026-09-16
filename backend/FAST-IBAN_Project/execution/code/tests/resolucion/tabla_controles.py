"""ALG-308b: tabla de controles (docs/invariancia_resolucion.md §8) de FAST-IBAN y DAV, en Markdown.

Uso: tabla_controles.py <dir JSON de tabla_invariancia.py> <dir JSON de dav_resolucion.py> <caso>:<pasos por día>...
En el directorio de DAV se esperan <caso>.json y <caso>_ghgs2.json.
"""
import json
import os
import sys


def f(x, d=2):
    return "—" if x is None else f"{x:.{d}f}".replace(".", ",")


def fila(nombre, dominio, r, seis_horas):
    m = {k: r[k][dominio] for k in ("persistencia", "dec2", "avg2", "dec4", "avg4")}
    cociente = (1 - m["avg4"]["iou"]) / (1 - m["persistencia"]["iou"]) if seis_horas and m["persistencia"]["iou"] < 1 else None
    return (f"| {nombre} | {dominio} | {f(m['persistencia']['iou'])} | {f(m['avg2']['iou'], 3)} | {f(m['avg4']['iou'], 3)} | "
            f"{f(m['dec4']['iou'] - m['avg4']['iou'], 3)} | {f(cociente)} | {f(m['avg4']['delta_eff_km'], 0)} / "
            f"{f(m['persistencia']['delta_eff_km'], 0)} | {f(100 * m['avg4']['fraccion'], 1)} % | {f(m['avg4']['azar'], 3)} |")


def main():
    nuestros, dav = sys.argv[1], sys.argv[2]
    for arg in sys.argv[3:]:
        caso, pasos_dia = arg.rsplit(":", 1)
        seis_horas = int(pasos_dia) == 4
        r = json.load(open(os.path.join(nuestros, caso + ".json")))
        d = json.load(open(os.path.join(dav, caso + ".json")))
        d2 = json.load(open(os.path.join(dav, caso + "_ghgs2.json")))
        pers = "6 h" if seis_horas else "24 h"
        print(f"\n### {caso}\n")
        print(f"| Método y fase | Dominio | IoU persistencia {pers} | IoU 0,5° prom. | IoU 1° prom. | Coste del promedio a 1° (dec − prom) | "
              f"R a 1° | δ_eff 1° / persistencia (km) | f | IoU por azar |")
        print("|---|---|---|---|---|---|---|---|---|---|")
        for fase, tipo, nombre in (("formaciones", "bloqueo", "FAST-IBAN formaciones"),
                                   ("candidatos", "MAX", "FAST-IBAN candidatos MAX"),
                                   ("candidatos", "MIN", "FAST-IBAN candidatos MIN")):
            por_comp = {k: r[k][fase][tipo] for k in r}
            for dominio in ("30-75", "total"):
                print(fila(nombre, dominio, por_comp, seis_horas))
        print(fila("DAV", "30-75", d, seis_horas))
        print(fila("DAV con GHGS2", "30-75", d2, seis_horas))


if __name__ == "__main__":
    main()
