#!/bin/sh
# ALG-302: ejecuta un binario FAST-IBAN (code/ o code_t/) y comprueba que termina bien y que todas las latitudes
# de los CSV de puntos quedan entre el límite inferior pedido y la primera latitud del fichero.
# Uso: comprobar_latitudes.sh <binario> <caso.nc> <lat_min> <lat_max> <lat_superior_del_fichero> [techo [lon_min lon_max]]
# Con <techo> se comprueba ese límite superior en vez de la primera latitud del fichero (ALG-374, hemisferio sur).
set -eu

BIN=$(realpath "$1")
CASO=$(realpath "$2")
LAT_MIN=$3; LAT_MAX=$4; LAT_SUP=${6:-$5}
# ALG-369: con longitudes, el área se pide así al binario y también se comprueba la longitud de los puntos.
LON_MIN=${7:--180}; LON_MAX=${8:-180}

TMP=$(mktemp -d)
cd "$TMP"
# LANZADOR antepone, p. ej., "valgrind --error-exitcode=3": leer filas fuera de la rejilla no siempre rompe el
# proceso, pero valgrind sí lo detecta. Sin comillas a propósito, para que se separe en palabras.
# shellcheck disable=SC2086
if ! ${LANZADOR:-} "$BIN" "$CASO" "$LAT_MIN" "$LAT_MAX" "$LON_MIN" "$LON_MAX" out/ 1 > ejecucion.log 2>&1; then
    tail -20 ejecucion.log
    echo "ERROR: el binario terminó con error"
    exit 1
fi

# CSV de puntos: los que tienen la latitud en la segunda columna (selected en code/, salida única en code_t/).
filas=0
for f in out/*.csv; do
    case "$(grep -v '^#' "$f" | head -1 | cut -d, -f2)" in lat*) ;; *) continue ;; esac
    fuera=$(grep -v '^#' "$f" | tail -n +2 | awk -F, -v min="$LAT_MIN" -v sup="$LAT_SUP" -v lmin="$LON_MIN" -v lmax="$LON_MAX" '$2 < min - 1e-4 || $2 > sup + 1e-4 || $3 < lmin - 1e-4 || $3 > lmax + 1e-4' | wc -l)
    n=$(grep -v '^#' "$f" | tail -n +2 | wc -l)
    filas=$((filas + n))
    if [ "$fuera" -ne 0 ]; then
        echo "ERROR: $fuera de $n puntos de $(basename "$f") fuera de [$LAT_MIN, $LAT_SUP]; ejemplos:"
        grep -v '^#' "$f" | tail -n +2 | awk -F, -v min="$LAT_MIN" -v sup="$LAT_SUP" -v lmin="$LON_MIN" -v lmax="$LON_MAX" '$2 < min - 1e-4 || $2 > sup + 1e-4 || $3 < lmin - 1e-4 || $3 > lmax + 1e-4' | head -3
        exit 1
    fi
done
if [ "$filas" -eq 0 ]; then
    echo "ERROR: ningún punto en la salida (la comprobación no diría nada)"
    exit 1
fi
echo "OK: $filas puntos, todos con latitud en [$LAT_MIN, $LAT_SUP]"
