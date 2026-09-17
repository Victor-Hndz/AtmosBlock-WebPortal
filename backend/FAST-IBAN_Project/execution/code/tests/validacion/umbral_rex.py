"""ALG-368: validación de rex_max_offset_km = 780 frente a 700 km (docs/validacion_umbral_rex.md §2). Solo biblioteca estándar.

Cada semestre son cuatro directorios con los CSV del núcleo (selected y formations): 700 y 780 km a 0,25°, 1060 km a
0,25° y 1060 km a 1°. La ejecución de 1060 solo sirve para emparejar (continuidad y robustez), no es candidata.
Uso: umbral_rex.py --semestre d700,d780,d1060,d1060_1grado [--semestre ...]
"""
import argparse
import csv
import glob
import json
import math
import os
import random
import statistics
from collections import defaultdict

R = 6371.0
RADIO_CONTINUIDAD_KM = 500
RADIO_ROBUSTEZ_DEG = 1.0
MARGEN = 0.15
REPLICAS = 2000
SEMILLA = 368


def distancia_al_meridiano(p, ref):
    """Distancia (km) de p al meridiano de ref, como distancia_al_meridiano del núcleo: INF si Δλ >= 90°."""
    dl = math.radians(p[1] - ref[1])
    if math.cos(dl) < 1e-9:
        return math.inf
    return R * math.asin(math.cos(math.radians(p[0])) * abs(math.sin(dl)))


def distancia_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(h)))


def _cerca_en_grados(a, b):
    dlon = abs((a[1] - b[1] + 180) % 360 - 180)
    return abs(a[0] - b[0]) <= RADIO_ROBUSTEZ_DEG and dlon <= RADIO_ROBUSTEZ_DEG


def _filas(patron):
    for ruta in sorted(glob.glob(patron)):
        with open(ruta, newline="") as f:
            yield from csv.DictReader(linea for linea in f if not linea.startswith("#"))


def leer_rex(directorio, semestre):
    """Rex de una ejecución: {(semestre, t, max, min): (centroide máx, centroide mín)} y los tipos por (semestre, t, max)."""
    centroides = {}
    for fila in _filas(os.path.join(directorio, "*_selected_*.csv")):
        centroides[(int(fila["time"]), int(fila["cluster"]))] = (float(fila["centroid_lat"]), float(fila["centroid_lon"]))
    rex, tipos = {}, {}
    for fila in _filas(os.path.join(directorio, "*_formations_*.csv")):
        t, mx = int(fila["time"]), int(fila["max_id"])
        tipos[(semestre, t, mx)] = fila["type"]
        if fila["type"] == "REX":
            mn = int(fila["min1_id"])
            rex[(semestre, t, mx, mn)] = (centroides[(t, mx)], centroides[(t, mn)])
    return rex, tipos


def _por_paso(rex):
    d = defaultdict(list)
    for (s, t, _, _), par in rex.items():
        d[(s, t)].append(par)
    return d


def _continuo(clave, par, pares_1060):
    s, t = clave[0], clave[1]
    return any(distancia_km(par[0], o[0]) <= RADIO_CONTINUIDAD_KM and distancia_km(par[1], o[1]) <= RADIO_CONTINUIDAD_KM
               for dt in (-1, 1) for o in pares_1060.get((s, t + dt), []))


def _robusto(clave, par, pares_1grado):
    return any(_cerca_en_grados(par[0], o[0]) and _cerca_en_grados(par[1], o[1]) for o in pares_1grado.get((clave[0], clave[1]), []))


def _episodios(rex):
    """Componentes conexas de los Rex unidos entre pasos consecutivos (máximo y mínimo a <= 500 km)."""
    claves = sorted(rex)
    padre = {k: k for k in claves}

    def raiz(k):
        while padre[k] != k:
            padre[k] = padre[padre[k]]
            k = padre[k]
        return k

    por_paso = defaultdict(list)
    for k in claves:
        por_paso[(k[0], k[1])].append(k)
    for k in claves:
        for o in por_paso.get((k[0], k[1] + 1), []):
            if distancia_km(rex[k][0], rex[o][0]) <= RADIO_CONTINUIDAD_KM and distancia_km(rex[k][1], rex[o][1]) <= RADIO_CONTINUIDAD_KM:
                padre[raiz(o)] = raiz(k)
    return {k: raiz(k) for k in claves}


def _percentil(valores, p):
    orden = sorted(valores)
    return orden[min(len(orden) - 1, max(0, math.ceil(p / 100 * len(orden)) - 1))]


def analizar(semestres):
    r700, r780, r1060, r1060_1, tipos700, tipos780 = {}, {}, {}, {}, {}, {}
    for s, (d700, d780, d1060, d1060_1) in enumerate(semestres):
        for destino, tipos, d in ((r700, tipos700, d700), (r780, tipos780, d780), (r1060, {}, d1060), (r1060_1, {}, d1060_1)):
            rex, t = leer_rex(d, s)
            destino.update(rex)
            tipos.update(t)
    pares_1060, pares_1grado = _por_paso(r1060), _por_paso(r1060_1)

    grupo = {}
    for k, par in r780.items():
        d = distancia_al_meridiano(par[1], par[0])
        if d <= 700:
            grupo[k] = "C"
        elif d <= 780 and k not in r700:
            grupo[k] = "M"
    episodio = _episodios(r780)
    datos = {k: (grupo[k], _continuo(k, r780[k], pares_1060), _robusto(k, r780[k], pares_1grado)) for k in grupo}

    def medias(claves):
        m = {"M": [0, 0, 0], "C": [0, 0, 0]}
        for k in claves:
            g, p, rb = datos[k]
            m[g][0] += 1
            m[g][1] += p
            m[g][2] += rb
        return {g: (v[1] / v[0], v[2] / v[0]) if v[0] else None for g, v in m.items()}, {g: v[0] for g, v in m.items()}

    base, n = medias(datos)
    por_episodio = defaultdict(list)
    for k in datos:
        por_episodio[episodio[k]].append(k)
    lista = sorted(por_episodio)
    rng = random.Random(SEMILLA)
    d_p, d_r = [], []
    for _ in range(REPLICAS):
        muestra = [k for _ in lista for k in por_episodio[lista[int(rng.random() * len(lista))]]]
        m, _ = medias(muestra)
        if m["M"] and m["C"]:
            d_p.append(m["M"][0] - m["C"][0])
            d_r.append(m["M"][1] - m["C"][1])

    marginales = [k for k in datos if datos[k][0] == "M"]
    nucleo = [k for k in datos if datos[k][0] == "C"]
    sustituciones = sum(1 for (s, t, mx, mn) in r780 for (s2, t2, mx2, mn2) in r700 if (s, t, mx) == (s2, t2, mx2) and mn != mn2)
    omega_a_rex = sum(1 for (s, t, mx, _) in r780 if tipos700.get((s, t, mx)) == "OMEGA")
    return {
        "n_M": n["M"], "n_C": n["C"],
        "episodios_M": len({episodio[k] for k in marginales}), "episodios_C": len({episodio[k] for k in nucleo}),
        "P_M": base["M"][0] if base["M"] else None, "R_M": base["M"][1] if base["M"] else None,
        "P_C": base["C"][0] if base["C"] else None, "R_C": base["C"][1] if base["C"] else None,
        "ic90_dP": (_percentil(d_p, 5), _percentil(d_p, 95)) if d_p else None,
        "ic90_dR": (_percentil(d_r, 5), _percentil(d_r, 95)) if d_r else None,
        "replicas_validas": len(d_p),
        "fraccion_M_bajo_35N": sum(abs(r780[k][1][0]) < 35 for k in marginales) / len(marginales) if marginales else None,
        "mediana_phimin_M": statistics.median(abs(r780[k][1][0]) for k in marginales) if marginales else None,
        "mediana_phimin_C": statistics.median(abs(r780[k][1][0]) for k in nucleo) if nucleo else None,
        "sustituciones": sustituciones, "omega_a_rex": omega_a_rex,
        "rex_700": len(r700), "rex_780": len(r780),
    }


def muestra_suficiente(r):
    return r["n_M"] >= 30 and r["episodios_M"] >= 10


def decidir(r):
    """Regla de §2: adoptar 780, mantener 700 o abierta."""
    for ic in (r["ic90_dP"], r["ic90_dR"]):
        if ic is not None and ic[1] < -MARGEN:
            return "mantener 700"
    if (muestra_suficiente(r) and r["ic90_dP"] is not None and r["ic90_dR"] is not None and r["ic90_dP"][0] >= -MARGEN
            and r["ic90_dR"][0] >= -MARGEN and r["fraccion_M_bajo_35N"] < 0.25):
        return "adoptar 780"
    return "abierta"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--semestre", action="append", required=True)
    a = p.parse_args()
    r = analizar([tuple(s.split(",")) for s in a.semestre])
    r["muestra_suficiente"] = muestra_suficiente(r)
    r["decision"] = decidir(r)
    print(json.dumps(r, indent=1, sort_keys=True))


if __name__ == "__main__":
    main()
