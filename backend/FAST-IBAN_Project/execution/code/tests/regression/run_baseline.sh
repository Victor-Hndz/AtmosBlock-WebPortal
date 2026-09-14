#!/bin/sh
# ALG-003: ejecuta FAST-IBAN sobre el caso fijo y compara el SHA-256 de sus CSV con baseline.sha256.
# Los nombres de los CSV llevan la hora de ejecución, así que se compara solo su contenido.
# Uso: run_baseline.sh <binario FAST-IBAN> [--actualizar]
set -eu

AQUI=$(cd "$(dirname "$0")" && pwd)
BIN=$(realpath "$1")
CASO="$AQUI/../fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc"
BASE="$AQUI/baseline.sha256"

# Directorio temporal: el binario hace chdir si el directorio actual se llama "build".
TMP=$(mktemp -d)
cd "$TMP"
if ! "$BIN" "$CASO" 25 85 -180 180 out/ 1 > ejecucion.log 2>&1; then
    cat ejecucion.log
    echo "ERROR: FAST-IBAN terminó con error"
    exit 1
fi

# ALG-005: contadores de findIndex == -1; forman parte de la línea base.
contadores=$(grep -E '^(findIndex|bilinear_interpolation):' ejecucion.log || true)
if [ -z "$contadores" ]; then
    echo "ERROR: FAST-IBAN no informa de los contadores de findIndex (ALG-005)"
    exit 1
fi

{
    echo "$(cat out/*_selected_*.csv | sha256sum | cut -d' ' -f1)  selected.csv"
    echo "$(cat out/*_formations_*.csv | sha256sum | cut -d' ' -f1)  formations.csv"
    echo "$contadores"
} > actual.sha256

if [ "${2:-}" = "--actualizar" ]; then
    cp actual.sha256 "$BASE"
    echo "Línea base actualizada:"
    cat "$BASE"
    exit 0
fi

if [ ! -f "$BASE" ]; then
    echo "ERROR: no existe $BASE (genérala con --actualizar)"
    cat actual.sha256
    exit 1
fi
if ! diff "$BASE" actual.sha256; then
    echo "ERROR: la salida de FAST-IBAN ha cambiado respecto a la línea base."
    echo "Si el cambio es intencionado, mide el delta de detecciones y actualiza con --actualizar."
    exit 1
fi
echo "Salida idéntica a la línea base"
