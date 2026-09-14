#!/bin/sh
# ALG-001: compila con -Wall -Wextra y falla si aparece un aviso que no esté en la línea base.
# Uso, desde la raíz del repo: check_warnings.sh [--actualizar]
set -eu

CODE=backend/FAST-IBAN_Project/execution/code
BASE=docs/warnings_baseline.txt
BUILD=$(mktemp -d)

cmake -S "$CODE" -B "$BUILD" -DCMAKE_C_FLAGS="-Wall -Wextra" > /dev/null
if ! cmake --build "$BUILD" > "$BUILD/build.log" 2>&1; then
    cat "$BUILD/build.log"
    echo "ERROR: el código no compila con -Wall -Wextra"
    exit 1
fi

# "fichero: mensaje [opción]", sin línea ni columna: cambian con cualquier edición.
grep 'warning:' "$BUILD/build.log" \
    | sed -E 's#^.*/execution/code/##; s#:[0-9]+:[0-9]+: warning:#:#' \
    | LC_ALL=C sort > "$BUILD/avisos.txt" || true

if [ "${1:-}" = "--actualizar" ]; then
    mkdir -p "$(dirname "$BASE")"
    cp "$BUILD/avisos.txt" "$BASE"
    echo "Línea base actualizada: $(wc -l < "$BASE") avisos"
    exit 0
fi

nuevos=$(LC_ALL=C comm -13 "$BASE" "$BUILD/avisos.txt")
if [ -n "$nuevos" ]; then
    echo "Avisos nuevos respecto a $BASE:"
    echo "$nuevos"
    exit 1
fi

# La línea base solo puede encoger: un aviso corregido debe salir de ella.
obsoletos=$(LC_ALL=C comm -23 "$BASE" "$BUILD/avisos.txt")
if [ -n "$obsoletos" ]; then
    echo "Avisos de $BASE que ya no aparecen (quítalos con --actualizar):"
    echo "$obsoletos"
    exit 1
fi
echo "Sin avisos nuevos: $(wc -l < "$BUILD/avisos.txt") actuales, $(wc -l < "$BASE") en la línea base"
