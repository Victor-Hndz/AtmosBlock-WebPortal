#!/bin/sh
# ALG-305: los parámetros de params.yaml se usan de verdad. Con un fichero alternativo, su valor aparece en la cabecera
# de los CSV y la salida (sin cabecera) difiere de la línea base del caso fijo.
# Uso: comprobar_parametros.sh <binario> <caso.nc> <params.yaml> "<clave: valor>" <baseline.sha256>
set -eu

BIN=$(realpath "$1")
CASO=$(realpath "$2")
PARAMS=$(realpath "$3")
ESPERADO=$4
BASE=$(realpath "$5")

TMP=$(mktemp -d)
cd "$TMP"
if ! FAST_IBAN_PARAMS="$PARAMS" "$BIN" "$CASO" 25 85 -180 180 out/ 1 > ejecucion.log 2>&1; then
    tail -20 ejecucion.log
    echo "ERROR: el binario terminó con error"
    exit 1
fi

revisados=0
for f in out/*_selected_*.csv out/*_formations_*.csv; do
    [ -e "$f" ] || continue  # code_t no escribe formaciones
    revisados=$((revisados + 1))
    if ! grep -qx "# $ESPERADO" "$f"; then
        echo "ERROR: $(basename "$f") no lleva '# $ESPERADO' en la cabecera:"
        head -15 "$f"
        exit 1
    fi
done
if [ "$revisados" -eq 0 ]; then
    echo "ERROR: no hay CSV de salida"
    exit 1
fi

actual=$(grep -hv '^#' out/*_selected_*.csv | sha256sum | cut -d' ' -f1)
if grep -q "^$actual " "$BASE"; then
    echo "ERROR: con '$ESPERADO' la salida es idéntica a la línea base: el parámetro no se usa"
    exit 1
fi
echo "OK: '$ESPERADO' en la cabecera y la salida cambia"
