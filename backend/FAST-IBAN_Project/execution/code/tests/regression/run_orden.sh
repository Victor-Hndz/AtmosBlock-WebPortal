#!/bin/sh
# ALG-108: las formaciones no deben depender del orden en que se recorren los clusters.
# Ejecuta FAST-IBAN en orden normal y con FAST_IBAN_INVERTIR_CLUSTERS (mismos clusters, mismos id,
# orden inverso) y compara las formaciones ordenadas.
# Uso: run_orden.sh <binario FAST-IBAN> <caso.nc>
set -eu

BIN=$(realpath "$1")
CASO=$(realpath "$2")

TMP=$(mktemp -d)
cd "$TMP"
for modo in normal invertido; do
    mkdir "$modo"
    cd "$modo"
    if [ "$modo" = invertido ]; then
        export FAST_IBAN_INVERTIR_CLUSTERS=1
    fi
    if ! "$BIN" "$CASO" 25 85 -180 180 out/ 1 > ejecucion.log 2> errores.log; then
        cat ejecucion.log errores.log
        echo "ERROR: FAST-IBAN terminó con error ($modo)"
        exit 1
    fi
    grep -hv '^#' out/*_formations_*.csv | tail -n +2 | LC_ALL=C sort > "../$modo.txt"
    cd ..
done

if ! diff normal.txt invertido.txt; then
    echo "ERROR: las formaciones cambian al invertir el orden de los clusters"
    exit 1
fi
echo "Formaciones idénticas en ambos órdenes: $(wc -l < normal.txt)"
