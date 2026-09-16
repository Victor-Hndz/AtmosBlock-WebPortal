#!/bin/sh
# ALG-307: simetría hemisférica. El caso <norte.nc> (90°N-0°) se ejecuta con límites 25..85 y su reflejo en el ecuador,
# recortado a 25°S (<sur.nc>), con límites -90..-25. Los puntos seleccionados y las formaciones (por centroides) deben
# ser los mismos con la latitud cambiada de signo.
# Uso: comprobar_simetria.sh <binario FAST-IBAN> <norte.nc> <sur.nc>
set -eu

BIN=$(realpath "$1")
NORTE=$(realpath "$2")
SUR=$(realpath "$3")
TMP=$(mktemp -d)

ejecutar() {  # ejecutar <caso> <lat_min> <lat_max> <directorio>
    mkdir -p "$TMP/$4"
    cd "$TMP/$4"
    if ! "$BIN" "$1" "$2" "$3" -180 180 out/ 1 > ejecucion.log 2>&1; then
        tail -20 ejecucion.log
        echo "ERROR: el binario terminó con error ($4)"
        exit 1
    fi
    grep -hv '^#' out/*_selected_*.csv > sel.csv
    grep -hv '^#' out/*_formations_*.csv > form.csv
}

# Puntos y formaciones con la latitud multiplicada por <signo>; las formaciones por centroides (los ids de cluster
# dependen del orden de recorrido, que no es simétrico).
normalizar() {  # normalizar <directorio> <signo>
    cd "$TMP/$1"
    awk -F, -v s="$2" 'NR > 1 { printf "%s,%.2f,%.2f,%s\n", $1, s * $2, $3, $5 }' sel.csv | LC_ALL=C sort > puntos.txt
    awk -F, -v s="$2" 'NR==FNR { if (FNR>1) c[$1","$6] = sprintf("%.2f %.2f", s * $7, $8); next }
         FNR>1 { m2 = ($4==-1) ? "-" : c[$1","$4]; print $1","$5","c[$1","$2]","c[$1","$3]","m2 }' sel.csv form.csv \
        | LC_ALL=C sort > formaciones.txt
}

ejecutar "$NORTE" 25 85 norte
ejecutar "$SUR" -90 -25 sur
normalizar norte 1
normalizar sur -1

fallos=0
for f in puntos formaciones; do
    n=$(wc -l < "$TMP/norte/$f.txt")
    distintas=$(LC_ALL=C comm -3 "$TMP/norte/$f.txt" "$TMP/sur/$f.txt" | wc -l)
    echo "$f: $n en el norte, $(wc -l < "$TMP/sur/$f.txt") en el sur reflejado; distintas: $distintas"
    if [ "$distintas" -ne 0 ]; then
        LC_ALL=C comm -3 "$TMP/norte/$f.txt" "$TMP/sur/$f.txt" | head -5
        fallos=1
    fi
done
if [ "$(wc -l < "$TMP/norte/formaciones.txt")" -eq 0 ]; then
    echo "ERROR: ninguna formación en el norte (la comprobación no diría nada)"
    exit 1
fi
[ $fallos -eq 0 ] && echo "OK: detecciones simétricas entre hemisferios"
exit $fallos
