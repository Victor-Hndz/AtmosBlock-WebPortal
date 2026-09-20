"""ALG-371: distribución del área de los clusters reales frente al filtro de área mínima (ALG-306).

El filtro descarta los clusters antes de exportarlos, así que hay que ejecutar el detector con el filtro
desactivado para ver la distribución completa:

    sed 's/^min_cluster_area_km2: .*/min_cluster_area_km2: 0/' config/params.yaml > /tmp/sin_filtro.yaml
    FAST_IBAN_PARAMS=/tmp/sin_filtro.yaml ./FAST-IBAN_omp <caso.nc> 25 90 -180 180 out/ 8
    grep -hv '^#' out/*_selected_*.csv > sel.csv
    python area_minima.py sel.csv

Imprime, por tipo, cuántos clusters pasan el filtro actual y cómo cambiaría con otros umbrales. El área de
cada celda de candidatos es la de su banda (ALG-373), igual que en el núcleo.
"""

import collections
import csv
import math
import sys

R = 6371.0  # km, el mismo radio que lib.h


def area_celda_km2(lat, paso):
    arriba, abajo = min(lat + paso / 2, 90), max(lat - paso / 2, -90)
    return R * R * math.radians(paso) * (math.sin(math.radians(arriba)) - math.sin(math.radians(abajo)))


def clusters(ruta, paso):
    """Área, tipo y latitud extrema de cada cluster del CSV de puntos seleccionados."""
    acumulado = collections.defaultdict(lambda: [0.0, None, 0.0])
    with open(ruta, newline="") as f:
        for fila in csv.reader(l for l in f if not l.startswith("#")):
            if len(fila) < 6 or fila[0] == "time":
                continue
            lat, tipo, clave = float(fila[1]), fila[4], (fila[0], fila[5])
            acumulado[clave][0] += area_celda_km2(lat, paso)
            acumulado[clave][1] = tipo
            if abs(lat) > abs(acumulado[clave][2]):
                acumulado[clave][2] = lat
    return list(acumulado.values())


def main():
    ruta = sys.argv[1]
    paso = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    umbrales = [float(u) for u in sys.argv[3:]] or [22000, 22300, 28800]
    datos = clusters(ruta, paso)
    print(f"{len(datos)} clusters en {ruta} (candidatos cada {paso}°)")
    for tipo in ("MAX", "MIN"):
        areas = sorted(a for a, t, _ in datos if t == tipo)
        if not areas:
            continue
        print(f"\n{tipo}: {len(areas)} clusters; mediana {areas[len(areas) // 2]:.0f} km², "
              f"p10 {areas[len(areas) // 10]:.0f}, p90 {areas[int(len(areas) * 0.9)]:.0f}")
        for u in umbrales:
            pasan = sum(1 for a in areas if a >= u)
            print(f"  umbral {u:8.0f} km²: pasan {pasan:5d} ({100 * pasan / len(areas):5.1f} %)")
        for lo, hi in ((0, 11000), (11000, 22000), (22000, 28800), (28800, 100000), (100000, 1e12)):
            n = sum(1 for a in areas if lo <= a < hi)
            print(f"  {lo:8.0f}–{hi:<9.0f}: {n:5d} ({100 * n / len(areas):5.1f} %)")


if __name__ == "__main__":
    main()
