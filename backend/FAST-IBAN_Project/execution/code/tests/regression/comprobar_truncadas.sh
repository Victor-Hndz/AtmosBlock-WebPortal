#!/bin/sh
# ALG-376: una formación se marca truncada cuando algún rayo de contorno se queda sin datos porque el fichero se
# acaba (no cuando para en el límite de análisis pedido). Ejecuta el binario y comprueba cuántas salen marcadas.
# Uso: comprobar_truncadas.sh <binario> <caso.nc> <lat_min> <lat_max> <esperado: ninguna|alguna>
set -eu

BIN=$(realpath "$1")
CASO=$(realpath "$2")
LAT_MIN=$3; LAT_MAX=$4; ESPERADO=$5

TMP=$(mktemp -d)
cd "$TMP"
if ! "$BIN" "$CASO" "$LAT_MIN" "$LAT_MAX" -180 180 out/ 1 > ejecucion.log 2>&1; then
    tail -20 ejecucion.log
    echo "ERROR: el binario terminó con error"
    exit 1
fi

total=$(grep -hv '^#' out/*_formations_*.csv | grep -cv '^time,' || true)
truncadas=$(grep -hv '^#' out/*_formations_*.csv | awk -F, 'NR > 0 && $6 == 1' | wc -l)
echo "$total formaciones, $truncadas truncadas (esperado: $ESPERADO)"

if [ "$ESPERADO" = ninguna ] && [ "$truncadas" -ne 0 ]; then
    echo "ERROR: el fichero cubre todo el dominio pedido, ninguna formación debería salir truncada"
    exit 1
fi
if [ "$ESPERADO" = alguna ] && [ "$truncadas" -eq 0 ]; then
    echo "ERROR: el fichero se corta dentro del dominio pedido, alguna formación debería salir truncada"
    exit 1
fi
rm -rf "$TMP"
