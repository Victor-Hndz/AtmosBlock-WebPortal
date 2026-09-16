"""ALG-308: invariancia a la resolución de las detecciones (docs/invariancia_resolucion.md §4-§5). Solo biblioteca estándar.

Una ejecución es un directorio con `normal/` (params.yaml sin tocar) y `candidatos/` (sin filtros de área ni latitud),
cada uno con los `*_selected_*.csv` y `*_formations_*.csv` del núcleo. Todo se compara sobre la retícula de 1° de los
candidatos, ponderando cada punto por el área de su celda; la fila de ±90° es un único punto (el casquete).

Uso: iou_resolucion.py <ejecución 0,25°> <ejecución degradada> --pasos-dia N [--desfase K]
Con --desfase K compara el paso t de la primera con el t+K de la segunda (persistencia si son la misma).
"""
import argparse
import csv
import glob
import json
import math
import os
import random
import statistics
from collections import Counter, defaultdict

R = 6371.0
BANDAS = ("30-50", "50-75", "75-90")
REPLICAS = 1000
SEMILLA = 308


def clave(lat, lon):
    """Punto de la retícula de 1°; en los polos todas las longitudes son el mismo punto."""
    lat, lon = round(lat), round(lon)
    if abs(lat) == 90:
        return (lat, 0)
    return (lat, (lon + 180) % 360 - 180)


def peso(lat):
    """Área en km² de la celda de 1° centrada en `lat` (casquete en los polos)."""
    if abs(lat) == 90:
        return 2 * math.pi * R**2 * (1 - math.cos(math.radians(0.5)))
    return R**2 * math.radians(1) * (math.sin(math.radians(lat + 0.5)) - math.sin(math.radians(lat - 0.5)))


def banda(lat):
    a = abs(lat)
    return None if a < 30 else "30-50" if a < 50 else "50-75" if a < 75 else "75-90"


def _filas(patron):
    for ruta in sorted(glob.glob(patron)):
        with open(ruta, newline="") as f:
            yield from csv.DictReader(linea for linea in f if not linea.startswith("#"))


def leer_ejecucion(base):
    """Huellas por paso: candidatos y clusters por tipo, formaciones con su cluster MAX."""
    e = {"candidatos": defaultdict(lambda: defaultdict(set)), "clusters": defaultdict(lambda: defaultdict(set)),
         "objetos": defaultdict(dict), "formaciones": defaultdict(dict), "n": 0}
    for fila in _filas(os.path.join(base, "candidatos", "*_selected_*.csv")):
        t = int(fila["time"])
        e["candidatos"][fila["type"]][t].add(clave(float(fila["latitude"]), float(fila["longitude"])))
        e["n"] = max(e["n"], t + 1)
    clusters = defaultdict(lambda: [set(), None, None])
    for fila in _filas(os.path.join(base, "normal", "*_selected_*.csv")):
        t, k = int(fila["time"]), clave(float(fila["latitude"]), float(fila["longitude"]))
        e["clusters"][fila["type"]][t].add(k)
        c = clusters[(t, int(fila["cluster"]))]
        c[0].add(k)
        c[1], c[2] = fila["type"], (float(fila["centroid_lat"]), float(fila["centroid_lon"]))
        e["n"] = max(e["n"], t + 1)
    for (t, cid), (puntos, tipo, centroide) in clusters.items():
        e["objetos"][tipo][(t, cid)] = (frozenset(puntos), centroide, tipo)
    for fila in _filas(os.path.join(base, "normal", "*_formations_*.csv")):
        t, max_id = int(fila["time"]), int(fila["max_id"])
        puntos, centroide, _ = e["objetos"]["MAX"][(t, max_id)]
        e["formaciones"][t][max_id] = (puntos, centroide, fila["type"])
        e["n"] = max(e["n"], t + 1)
    return e


def _areas(a, b):
    """Intersección y unión por banda (y total por encima de 30°) de dos conjuntos de puntos."""
    r = {x: [0.0, 0.0] for x in BANDAS + ("total",)}
    for k in a | b:
        bd = banda(k[0])
        if bd is None:
            continue
        w = peso(k[0])
        dentro = k in a and k in b
        for x in (bd, "total"):
            r[x][0] += w * dentro
            r[x][1] += w
    return r


def _percentil(valores, p):
    orden = sorted(valores)
    return orden[min(len(orden) - 1, max(0, math.ceil(p / 100 * len(orden)) - 1))]


def _metricas_conjuntos(ref, deg, pasos, desfase, pasos_bloque):
    por_paso = [_areas(ref.get(t, set()), deg.get(t + desfase, set())) for t in pasos]
    bloques = [range(i, min(i + pasos_bloque, len(pasos))) for i in range(0, len(pasos), pasos_bloque)]
    rng = random.Random(SEMILLA)
    muestras = [[rng.randrange(len(bloques)) for _ in bloques] for _ in range(REPLICAS)] if bloques else []
    salida = {}
    for x in BANDAS + ("total",):
        inter = sum(p[x][0] for p in por_paso)
        union = sum(p[x][1] for p in por_paso)
        ious = [p[x][0] / p[x][1] for p in por_paso if p[x][1] > 0]
        replicas = []
        for muestra in muestras:
            i = sum(por_paso[s][x][0] for b in muestra for s in bloques[b])
            u = sum(por_paso[s][x][1] for b in muestra for s in bloques[b])
            if u > 0:
                replicas.append(i / u)
        salida[x] = {
            "iou": inter / union if union > 0 else None,
            "mediana_paso": statistics.median(ious) if ious else None,
            "p10_paso": _percentil(ious, 10) if ious else None,
            "pasos": len(ious),
            "ic95": (_percentil(replicas, 2.5), _percentil(replicas, 97.5)) if replicas else None,
        }
    return salida


def _distancia_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(h)))


def _area(puntos):
    return sum(peso(k[0]) for k in puntos)


def _metricas_objetos(ref, deg, pasos, desfase):
    """ref y deg: {t: {id: (puntos, centroide, tipo)}}. Emparejamiento uno a uno con IoU >= 0,5."""
    n_ref = n_deg = divisiones = fusiones = 0
    pares, distancias, confusion = [], [], Counter()
    for t in pasos:
        a, b = ref.get(t, {}), deg.get(t + desfase, {})
        n_ref, n_deg = n_ref + len(a), n_deg + len(b)
        solapes_a, solapes_b, candidatos = Counter(), Counter(), []
        for ia, (pa, _, _) in a.items():
            for ib, (pb, _, _) in b.items():
                comun = pa & pb
                if not comun:
                    continue
                solapes_a[ia] += 1
                solapes_b[ib] += 1
                i = _area(comun)
                valor = i / (_area(pa) + _area(pb) - i)
                if valor >= 0.5 - 1e-12:
                    candidatos.append((-valor, ia, ib))
        divisiones += sum(1 for v in solapes_a.values() if v >= 2)
        fusiones += sum(1 for v in solapes_b.values() if v >= 2)
        usados_a, usados_b = set(), set()
        for _, ia, ib in sorted(candidatos):
            if ia in usados_a or ib in usados_b:
                continue
            usados_a.add(ia)
            usados_b.add(ib)
            pares.append((t, ia, ib))
            distancias.append(_distancia_km(a[ia][1], b[ib][1]))
            confusion[(a[ia][2], b[ib][2])] += 1
    return {
        "objetos_ref": n_ref, "objetos_deg": n_deg,
        "emparejados_ref": len(pares) / n_ref if n_ref else None,
        "emparejados_deg": len(pares) / n_deg if n_deg else None,
        "divisiones": divisiones, "fusiones": fusiones,
        "distancia_mediana_km": statistics.median(distancias) if distancias else None,
        "distancia_p90_km": _percentil(distancias, 90) if distancias else None,
        "confusion": dict(confusion), "pares": pares,
    }


def comparar(ref, deg, desfase=0, pasos_bloque=5):
    pasos = range(max(ref["n"], deg["n"]) - desfase)
    r = {"candidatos": {}, "clusters": {"objetos": {}}, "formaciones": {}}
    for tipo in ("MAX", "MIN"):
        r["candidatos"][tipo] = _metricas_conjuntos(ref["candidatos"][tipo], deg["candidatos"][tipo], pasos, desfase, pasos_bloque)
        r["clusters"][tipo] = _metricas_conjuntos(ref["clusters"][tipo], deg["clusters"][tipo], pasos, desfase, pasos_bloque)
        por_paso = [defaultdict(dict), defaultdict(dict)]
        for i, e in enumerate((ref, deg)):
            for (t, cid), obj in e["objetos"][tipo].items():
                por_paso[i][t][cid] = obj
        r["clusters"]["objetos"][tipo] = _metricas_objetos(por_paso[0], por_paso[1], pasos, desfase)
    huellas = [{t: set().union(*(p for p, _, _ in f.values())) for t, f in e["formaciones"].items()} for e in (ref, deg)]
    r["formaciones"]["bloqueo"] = _metricas_conjuntos(huellas[0], huellas[1], pasos, desfase, pasos_bloque)
    r["formaciones"]["objetos"] = _metricas_objetos(ref["formaciones"], deg["formaciones"], pasos, desfase)
    return r


def _a_json(r):
    for obj in list(r["clusters"]["objetos"].values()) + [r["formaciones"]["objetos"]]:
        obj.pop("pares")
        obj["confusion"] = {f"{a}->{b}": n for (a, b), n in sorted(obj["confusion"].items())}
    return r


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("ref")
    p.add_argument("deg")
    p.add_argument("--pasos-dia", type=int, required=True, help="pasos por día (bloques de bootstrap de 5 días)")
    p.add_argument("--desfase", type=int, default=0)
    a = p.parse_args()
    r = comparar(leer_ejecucion(a.ref), leer_ejecucion(a.deg), a.desfase, 5 * a.pasos_dia)
    print(json.dumps(_a_json(r), indent=1, sort_keys=True))


if __name__ == "__main__":
    main()
