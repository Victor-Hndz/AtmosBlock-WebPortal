#!/bin/sh
# ALG-308: ejecuciones del test de invariancia a la resolución (docs/invariancia_resolucion.md).
# Por cada fichero global a 0,25°: variantes ref, dec2, dec4 (recortar_nc) y avg2, avg4 (degradar_nc), cada una en
# <salida>/<caso>/<variante>/normal (params.yaml) y /candidatos (sin filtros de área ni latitud).
# Uso, dentro de la imagen netcdf-base: medir_invariancia.sh <salida> <fichero.nc>...
set -eu
SALIDA=$1; shift
C=$(cd "$(dirname "$0")/../.." && pwd)
B=/tmp/invariancia_build; V=/tmp/invariancia_variantes
cmake -S "$C" -B $B > /dev/null
cmake --build $B --parallel --target FAST-IBAN_omp RECORTAR_NC DEGRADAR_NC > $B.log 2>&1 || { tail -20 $B.log; exit 1; }
sed -e 's/^min_cluster_area_km2: .*/min_cluster_area_km2: 0/' -e 's/^cluster_lat_min_deg: .*/cluster_lat_min_deg: 0/' \
    "$C/config/params.yaml" > /tmp/params_candidatos.yaml
mkdir -p $V

for origen in "$@"; do
    caso=$(basename "$origen" .nc)
    ln -sf "$(realpath "$origen")" $V/${caso}_ref.nc
    $B/tests/RECORTAR_NC "$origen" $V/${caso}_dec2.nc z 90 2 > /dev/null
    $B/tests/RECORTAR_NC "$origen" $V/${caso}_dec4.nc z 90 4 > /dev/null
    $B/tests/DEGRADAR_NC "$origen" $V/${caso}_avg2.nc z 2 > /dev/null
    $B/tests/DEGRADAR_NC "$origen" $V/${caso}_avg4.nc z 4 > /dev/null
    for v in ref dec2 dec4 avg2 avg4; do
        for modo in normal candidatos; do
            d="$SALIDA/$caso/$v/$modo"
            rm -rf "$d"; mkdir -p "$d"
            if [ $modo = candidatos ]; then export FAST_IBAN_PARAMS=/tmp/params_candidatos.yaml; else unset FAST_IBAN_PARAMS; fi
            (cd "$d" && $B/FAST-IBAN_omp $V/${caso}_$v.nc 25 90 -180 180 out/ "$(nproc)" > ejecucion.log 2>&1 && mv out/*.csv . && rm -rf out) \
                || { tail "$d/ejecucion.log"; exit 1; }
            echo "$caso $v $modo: $(grep -hv '^#' "$d"/*_selected_*.csv | tail -n +2 | wc -l) puntos"
        done
        rm -f $V/${caso}_$v.nc
    done
done
