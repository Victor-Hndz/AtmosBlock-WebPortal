#!/bin/sh
# ALG-112: ejecuta la variante de temperatura sobre su caso fijo y compara el SHA-256 de su CSV con baseline_t.sha256.
# El nombre del CSV lleva la hora de ejecución, así que se compara solo su contenido.
# Uso: run_baseline.sh <binario FAST-IBAN de code_t> [--actualizar]
set -eu

AQUI=$(cd "$(dirname "$0")" && pwd)
BIN=$(realpath "$1")
CASO="${CASO:-$AQUI/../../code/tests/fixtures/temp_850hPa_2019-06-28_00-06-12-18UTC.nc}"
BASE="${BASE:-$AQUI/baseline_t.sha256}"

# Directorio temporal: el binario hace chdir si el directorio actual se llama "build".
TMP=$(mktemp -d)
cd "$TMP"
if ! "$BIN" "$CASO" 25 85 -180 180 out/ 1 > ejecucion.log 2>&1; then
    cat ejecucion.log
    echo "ERROR: FAST-IBAN (temperatura) terminó con error"
    exit 1
fi

echo "$(cat out/*.csv | sha256sum | cut -d' ' -f1)  temperatura.csv" > actual.sha256

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
    echo "ERROR: la salida de la variante de temperatura ha cambiado respecto a la línea base."
    echo "Si el cambio es intencionado, mide el delta y actualiza con --actualizar."
    exit 1
fi
echo "Salida idéntica a la línea base"
